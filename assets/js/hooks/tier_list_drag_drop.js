const TierListDragDrop = {
    mounted() {
        console.log('TierListDragDrop hook mounted! VERSION 2024-12-19-REFACTORED');
        this.setupDragAndDrop();
        this.initializeTouchSupport();
    },

    updated() {
        this.removeDropIndicator();
        this.setupDragAndDrop();
        this.initializeTouchSupport();
    },

    destroyed() {
        this.removeDropIndicator();
        if (this.touchDragPreview) {
            this.touchDragPreview.remove();
            this.touchDragPreview = null;
        }

        if (this.boundHandlers) {
            this.el.querySelectorAll('[data-draggable]').forEach(item => {
                item.removeEventListener('dragstart', this.boundHandlers.dragStart);
                item.removeEventListener('dragend', this.boundHandlers.dragEnd);
            });

            this.el.querySelectorAll('[data-drop-zone="true"]').forEach(zone => {
                zone.removeEventListener('dragover', this.boundHandlers.dragOver);
                zone.removeEventListener('drop', this.boundHandlers.drop);
                zone.removeEventListener('dragenter', this.boundHandlers.dragEnter);
                zone.removeEventListener('dragleave', this.boundHandlers.dragLeave);
                zone.removeEventListener('touchmove', this.handleDropZoneTouchMove);
            });
        }

        document.querySelectorAll('.drop-indicator, .touch-drag-preview').forEach(el => el.remove());
    },

    // =============================================================================
    // SHARED CORE FUNCTIONS - Used by both touch and desktop implementations
    // =============================================================================

    /**
 * Unified position calculation for both touch and desktop drag operations
 * @param {Object} coordinates - {x, y} coordinates of the drop/touch point
 * @param {Element} dropZone - The drop zone element
 * @param {Element} draggedElement - The element being dragged
 * @returns {number} The calculated position for insertion
 */
    calculateDropPosition(coordinates, dropZone, draggedElement) {
        const { x: dropX, y: dropY } = coordinates;
        const allObjectsInTier = Array.from(dropZone.querySelectorAll('[data-object-id]'));

        if (allObjectsInTier.length === 0) {
            return 0;
        }

        // Get the original position of the dragged element
        const originalPosition = parseInt(draggedElement.dataset.position) || 0;

        // Sort ALL objects by their database position
        const sortedObjects = allObjectsInTier.sort((a, b) => {
            const posA = parseInt(a.dataset.position) || 0;
            const posB = parseInt(b.dataset.position) || 0;
            return posA - posB;
        });

        // Group objects by visual rows (excluding dragged object)
        const rows = this.groupObjectsByRows(sortedObjects, draggedElement);

        // Find target row based on Y coordinate
        const targetRow = this.findTargetRow(rows, dropY);

        if (!targetRow) {
            return sortedObjects.length;
        }

        // Find insertion point within the target row based on X coordinate
        const calculatedPosition = this.findInsertionPosition(targetRow, dropX);

        // Check if we're dropping in the same logical position
        // This happens when we're dropping right before the object that comes after us
        if (calculatedPosition === originalPosition + 1) {
            // Check if there's actually an object at originalPosition + 1
            const nextObject = sortedObjects.find(obj => parseInt(obj.dataset.position) === originalPosition + 1);
            if (nextObject && targetRow.some(rowObj => rowObj.position === originalPosition + 1)) {
                // We're dropping right before the next object, which means staying in the same position
                return originalPosition;
            }
        }

        return calculatedPosition;
    },

    /**
     * Groups objects into visual rows based on their Y positions
     * @param {Array} sortedObjects - Objects sorted by database position
     * @param {Element} draggedElement - Element to exclude from grouping
     * @returns {Array} Array of rows, each containing objects with position data
     */
    groupObjectsByRows(sortedObjects, draggedElement) {
        const rows = [];
        let currentRow = [];
        let lastTop = null;

        sortedObjects.forEach(obj => {
            if (obj === draggedElement) return;

            const rect = obj.getBoundingClientRect();
            if (lastTop === null || Math.abs(rect.top - lastTop) <= 10) {
                currentRow.push({ element: obj, rect, position: parseInt(obj.dataset.position) || 0 });
                lastTop = rect.top;
            } else {
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                }
                currentRow = [{ element: obj, rect, position: parseInt(obj.dataset.position) || 0 }];
                lastTop = rect.top;
            }
        });

        if (currentRow.length > 0) {
            rows.push(currentRow);
        }

        return rows;
    },

    /**
     * Finds the target row based on Y coordinate
     * @param {Array} rows - Array of row objects
     * @param {number} dropY - Y coordinate of drop point
     * @returns {Array|null} Target row or null if not found
     */
    findTargetRow(rows, dropY) {
        // First try exact match within row bounds
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const firstRect = row[0].rect;
            if (dropY >= firstRect.top - 20 && dropY <= firstRect.bottom + 20) {
                return row;
            }
        }

        // If no exact match, find closest row
        if (rows.length === 0) return null;

        let minDistance = Infinity;
        let targetRow = null;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowCenterY = row[0].rect.top + (row[0].rect.height / 2);
            const distance = Math.abs(dropY - rowCenterY);

            if (distance < minDistance) {
                minDistance = distance;
                targetRow = row;
            }
        }

        return targetRow;
    },

    /**
 * Finds the insertion position within a row based on X coordinate
 * @param {Array} targetRow - Array of objects in the target row
 * @param {number} dropX - X coordinate of drop point
 * @returns {number} Database position for insertion
 */
    findInsertionPosition(targetRow, dropX) {
        for (let i = 0; i < targetRow.length; i++) {
            const objRect = targetRow[i].rect;
            const objCenterX = objRect.left + objRect.width / 2;

            if (dropX < objCenterX) {
                return targetRow[i].position;
            }
        }

        // Insert after the last object in this row
        const lastInRow = targetRow[targetRow.length - 1];
        return lastInRow.position + 1;
    },

    /**
     * Unified drop indicator update for both touch and desktop
     * @param {Object} coordinates - {x, y} coordinates
     * @param {Element} dropZone - The drop zone element
     * @param {Element} draggedElement - The element being dragged
     */
    updateDropIndicator(coordinates, dropZone, draggedElement) {
        if (!this.dropIndicator) return;

        const { x: dropX, y: dropY } = coordinates;
        const allObjectsInTier = Array.from(dropZone.querySelectorAll('[data-object-id]'));

        let showIndicator = false;
        let indicatorX = 0;
        let indicatorY = 0;

        if (allObjectsInTier.length === 0) {
            const dropZoneRect = dropZone.getBoundingClientRect();
            indicatorX = dropZoneRect.left + 20;
            indicatorY = dropZoneRect.top + 10;
            this.dropIndicator.style.height = `${Math.max(60, dropZoneRect.height - 20)}px`;
            showIndicator = true;
        } else {
            const sortedObjects = allObjectsInTier.sort((a, b) => {
                const posA = parseInt(a.dataset.position) || 0;
                const posB = parseInt(b.dataset.position) || 0;
                return posA - posB;
            });

            const rows = this.groupObjectsByRows(sortedObjects, draggedElement);
            const targetRow = this.findTargetRow(rows, dropY);

            if (targetRow) {
                let targetObject = null;
                for (let i = 0; i < targetRow.length; i++) {
                    const objRect = targetRow[i].rect;
                    const objCenterX = objRect.left + objRect.width / 2;
                    if (dropX < objCenterX) {
                        targetObject = targetRow[i];
                        break;
                    }
                }

                if (targetObject) {
                    indicatorX = targetObject.rect.left - 8;
                    indicatorY = targetObject.rect.top;
                    this.dropIndicator.style.height = `${targetObject.rect.height}px`;
                    showIndicator = true;
                } else {
                    const lastInRow = targetRow[targetRow.length - 1];
                    indicatorX = lastInRow.rect.right + 8;
                    indicatorY = lastInRow.rect.top;
                    this.dropIndicator.style.height = `${lastInRow.rect.height}px`;
                    showIndicator = true;
                }
            }
        }

        if (showIndicator) {
            this.dropIndicator.style.display = 'block';
            this.dropIndicator.style.left = `${indicatorX}px`;
            this.dropIndicator.style.top = `${indicatorY}px`;
            this.dropIndicator.style.opacity = '1';
        } else {
            this.dropIndicator.style.display = 'none';
            this.dropIndicator.style.opacity = '0';
        }
    },

    /**
     * Creates the drop indicator element
     */
    createDropIndicator() {
        if (this.dropIndicator) return;

        this.dropIndicator = document.createElement('div');
        this.dropIndicator.className = 'drop-indicator';
        this.dropIndicator.style.cssText = `
            position: fixed;
            width: 3px;
            background: linear-gradient(to bottom, #3b82f6, #1d4ed8);
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
            display: none;
        `;
        document.body.appendChild(this.dropIndicator);
    },

    /**
     * Removes the drop indicator
     */
    removeDropIndicator() {
        if (this.dropIndicator) {
            this.dropIndicator.remove();
            this.dropIndicator = null;
        }
        document.querySelectorAll('.drop-indicator').forEach(indicator => indicator.remove());
    },

    /**
     * Handles the actual move operation - shared by both touch and desktop
     * @param {string} objectId - ID of the object being moved
     * @param {string} targetTierId - ID of the target tier
     * @param {number} position - Calculated position for insertion
     * @param {number} originalPosition - Original position of the object
     * @param {string} originalTierId - Original tier ID of the object
     */
    performMove(objectId, targetTierId, position, originalPosition, originalTierId) {
        // Only skip if both position AND tier are the same
        if (position === originalPosition && targetTierId === originalTierId) {
            console.log('Dropping in same position and tier, skipping move');
            return;
        }

        console.log('PERFORMING MOVE:', {
            object_id: objectId,
            tier_id: targetTierId,
            position: position,
            originalPosition: originalPosition,
            originalTierId: originalTierId
        });

        this.pushEvent('move_object', {
            object_id: objectId,
            tier_id: targetTierId,
            position: position
        });
    },

    // =============================================================================
    // TOUCH IMPLEMENTATION
    // =============================================================================

    initializeTouchSupport() {
        this.touchState = {
            isDragging: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            draggedElement: null,
            dragThreshold: 8,
            longPressTimer: null,
            longPressDelay: 300,
            isLongPress: false
        };

        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (this.isTouchDevice) {
            this.setupTouchEvents();
        }
    },

    setupTouchEvents() {
        // Setup touch events for draggable items
        this.el.querySelectorAll('[data-draggable="true"]').forEach(item => {
            item.removeEventListener('touchstart', this.handleTouchStart);
            item.removeEventListener('touchmove', this.handleTouchMove);
            item.removeEventListener('touchend', this.handleTouchEnd);
            item.removeEventListener('contextmenu', this.handleContextMenu);

            // Use passive: false for all touch events to allow preventDefault when needed
            item.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
            item.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            item.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
            item.addEventListener('contextmenu', this.handleContextMenu.bind(this), { passive: false });
        });

        // Setup touch events for drop zones to prevent scrolling during drag
        this.el.querySelectorAll('[data-drop-zone="true"]').forEach(zone => {
            zone.removeEventListener('touchmove', this.handleDropZoneTouchMove);
            zone.addEventListener('touchmove', this.handleDropZoneTouchMove.bind(this), { passive: false });
        });
    },

    handleDropZoneTouchMove(e) {
        // If we're currently dragging, prevent scrolling in drop zones
        if (this.touchState.isDragging) {
            e.preventDefault();
            e.stopPropagation();
        }
    },

    handleTouchStart(e) {
        const touch = e.touches[0];
        const draggableElement = e.target.closest('[data-object-id]');
        if (!draggableElement) return;

        this.touchState.startX = touch.clientX;
        this.touchState.startY = touch.clientY;
        this.touchState.currentX = touch.clientX;
        this.touchState.currentY = touch.clientY;
        this.touchState.draggedElement = draggableElement;
        this.touchState.isLongPress = false;

        draggableElement.classList.add('touch-pressed');
        if (navigator.vibrate) navigator.vibrate(10);

        this.touchState.longPressTimer = setTimeout(() => {
            if (!this.touchState.isDragging) {
                this.touchState.isLongPress = true;
                this.startTouchDrag(draggableElement);
            }
        }, this.touchState.longPressDelay);
    },

    handleTouchMove(e) {
        if (!this.touchState.draggedElement) return;

        const touch = e.touches[0];
        this.touchState.currentX = touch.clientX;
        this.touchState.currentY = touch.clientY;

        const deltaX = Math.abs(this.touchState.currentX - this.touchState.startX);
        const deltaY = Math.abs(this.touchState.currentY - this.touchState.startY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const isHorizontalMovement = deltaX > deltaY;
        const isSignificantHorizontalMovement = deltaX > 15;

        // If we're already dragging, always prevent default to stop scrolling
        if (this.touchState.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            this.updateTouchDrag(touch);
            return;
        }

        // Check if we should start dragging
        if (distance > this.touchState.dragThreshold &&
            (isHorizontalMovement || isSignificantHorizontalMovement)) {
            // Prevent default as soon as we detect drag intent
            e.preventDefault();
            e.stopPropagation();
            clearTimeout(this.touchState.longPressTimer);
            this.startTouchDrag(this.touchState.draggedElement);
            return;
        }

        // If movement is primarily vertical and small, allow normal scrolling
        if (deltaY > deltaX && deltaY > 5) {
            // This looks like a scroll gesture, don't interfere
            return;
        }

        // For any other movement on draggable elements, prevent default to avoid conflicts
        if (distance > 3) {
            e.preventDefault();
        }
    },

    handleTouchEnd(e) {
        clearTimeout(this.touchState.longPressTimer);

        if (this.touchState.draggedElement) {
            this.touchState.draggedElement.classList.remove('touch-pressed');
        }

        if (this.touchState.isDragging) {
            e.preventDefault();
            this.completeTouchDrag(e);
        } else {
            this.removeDropIndicator();
        }

        this.resetTouchState();
    },

    handleContextMenu(e) {
        const draggableElement = e.target.closest('[data-object-id]');
        if (draggableElement) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    },

    startTouchDrag(element) {
        this.touchState.isDragging = true;
        element.classList.add('touch-dragging');
        element.classList.remove('touch-pressed');
        this.createTouchDragPreview(element);
        this.createDropIndicator();

        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
        this.highlightDropZones(true);
    },

    updateTouchDrag(touch) {
        if (this.touchDragPreview) {
            // Center the preview on the touch point
            const previewRect = this.touchDragPreview.getBoundingClientRect();
            const offsetX = previewRect.width / 2;
            const offsetY = previewRect.height / 2;

            this.touchDragPreview.style.left = `${touch.clientX - offsetX}px`;
            this.touchDragPreview.style.top = `${touch.clientY - offsetY}px`;
        }

        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropZone = elementUnderTouch?.closest('[data-drop-zone="true"]');

        this.highlightCurrentDropZone(dropZone);

        if (dropZone) {
            this.updateDropIndicator(
                { x: touch.clientX, y: touch.clientY },
                dropZone,
                this.touchState.draggedElement
            );
        }
    },

    completeTouchDrag(e) {
        const touch = e.changedTouches[0];
        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropZone = elementUnderTouch?.closest('[data-drop-zone="true"]');

        if (dropZone && this.touchState.draggedElement) {
            const objectId = this.touchState.draggedElement.dataset.objectId;
            const targetTierId = dropZone.dataset.tierId;
            const originalPosition = parseInt(this.touchState.draggedElement.dataset.position) || 0;
            const originalTierId = this.touchState.draggedElement.closest('[data-drop-zone="true"]')?.dataset.tierId;

            const position = this.calculateDropPosition(
                { x: touch.clientX, y: touch.clientY },
                dropZone,
                this.touchState.draggedElement
            );

            this.performMove(objectId, targetTierId, position, originalPosition, originalTierId);

            if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
        }

        this.cleanupTouchDrag();
    },

    createTouchDragPreview(element) {
        // Get the original element's dimensions
        const rect = element.getBoundingClientRect();

        this.touchDragPreview = element.cloneNode(true);
        this.touchDragPreview.classList.add('touch-drag-preview');

        // Remove any problematic classes or attributes
        this.touchDragPreview.removeAttribute('draggable');
        this.touchDragPreview.classList.remove('touch-pressed', 'touch-dragging', 'opacity-50');

        // Ensure images are properly loaded and displayed
        const images = this.touchDragPreview.querySelectorAll('img');
        images.forEach(img => {
            img.style.display = 'block';
            img.style.visibility = 'visible';
            img.style.opacity = '1';
            img.removeAttribute('loading'); // Remove lazy loading
            img.draggable = false;

            // Force image to load if it hasn't already
            if (!img.complete) {
                img.src = img.src; // Trigger reload
            }
        });

        // Ensure all child elements are properly styled
        const allElements = [this.touchDragPreview, ...this.touchDragPreview.querySelectorAll('*')];
        allElements.forEach(el => {
            el.style.pointerEvents = 'none';
            el.style.userSelect = 'none';
        });

        // Use actual element dimensions with some scaling
        const scaledWidth = Math.min(rect.width * 0.9, 120); // Max 120px width
        const scaledHeight = Math.min(rect.height * 0.9, 120); // Max 120px height

        this.touchDragPreview.style.cssText = `
            position: fixed;
            width: ${scaledWidth}px;
            height: ${scaledHeight}px;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.85;
            transform: scale(1.05) rotate(3deg);
            transition: none;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            background: white;
            overflow: visible;
            display: block;
        `;
        document.body.appendChild(this.touchDragPreview);
    },

    cleanupTouchDrag() {
        if (this.touchDragPreview) {
            this.touchDragPreview.remove();
            this.touchDragPreview = null;
        }

        if (this.touchState.draggedElement) {
            this.touchState.draggedElement.classList.remove('touch-dragging', 'touch-pressed');
        }

        this.removeDropIndicator();
        this.highlightDropZones(false);
        document.querySelectorAll('.touch-drag-preview, .drop-indicator').forEach(el => el.remove());
    },

    resetTouchState() {
        this.touchState.isDragging = false;
        this.touchState.draggedElement = null;
        this.touchState.isLongPress = false;
        clearTimeout(this.touchState.longPressTimer);
    },

    // =============================================================================
    // DESKTOP IMPLEMENTATION
    // =============================================================================

    setupDragAndDrop() {
        if (!this.boundHandlers) {
            this.boundHandlers = {
                dragStart: this.handleDragStart.bind(this),
                dragEnd: this.handleDragEnd.bind(this),
                dragOver: this.handleDragOver.bind(this),
                drop: this.handleDrop.bind(this),
                dragEnter: this.handleDragEnter.bind(this),
                dragLeave: this.handleDragLeave.bind(this)
            };
        }

        // Remove existing listeners
        this.el.querySelectorAll('[data-draggable]').forEach(item => {
            item.removeEventListener('dragstart', this.boundHandlers.dragStart);
            item.removeEventListener('dragend', this.boundHandlers.dragEnd);
        });

        this.el.querySelectorAll('[data-drop-zone="true"]').forEach(zone => {
            zone.removeEventListener('dragover', this.boundHandlers.dragOver);
            zone.removeEventListener('drop', this.boundHandlers.drop);
            zone.removeEventListener('dragenter', this.boundHandlers.dragEnter);
            zone.removeEventListener('dragleave', this.boundHandlers.dragLeave);
        });

        // Add desktop drag and drop for non-touch devices
        if (!this.isTouchDevice) {
            this.el.querySelectorAll('[data-draggable="true"]').forEach(item => {
                item.draggable = true;
                item.addEventListener('dragstart', this.boundHandlers.dragStart);
                item.addEventListener('dragend', this.boundHandlers.dragEnd);
            });

            this.el.querySelectorAll('[data-drop-zone="true"]').forEach(zone => {
                zone.addEventListener('dragover', this.boundHandlers.dragOver);
                zone.addEventListener('drop', this.boundHandlers.drop);
                zone.addEventListener('dragenter', this.boundHandlers.dragEnter);
                zone.addEventListener('dragleave', this.boundHandlers.dragLeave);
            });
        }
    },

    handleDragStart(e) {
        const draggableElement = e.target.closest('[data-object-id]');
        const objectId = draggableElement?.dataset.objectId;

        if (!objectId) {
            e.preventDefault();
            return;
        }

        e.dataTransfer.setData('text/plain', objectId);
        e.target.classList.add('opacity-50');
        e.dataTransfer.effectAllowed = 'move';

        // Create a better custom drag image
        this.createDesktopDragImage(e, draggableElement);

        this.draggedElement = draggableElement;
        this.createDropIndicator();
    },

    createDesktopDragImage(e, element) {
        // Try to use the original element directly first
        const rect = element.getBoundingClientRect();

        // Create a simple visual clone that preserves the image
        const dragImage = document.createElement('div');
        const originalImg = element.querySelector('img');
        const originalName = element.querySelector('.object-name');

        if (originalImg && originalName) {
            // Create a simplified version with just the image and name
            dragImage.innerHTML = `
                <img src="${originalImg.src}" alt="${originalImg.alt}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; display: block;">
                <div style="text-align: center; margin-top: 4px; font-size: 12px; color: #333; font-weight: 500; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${originalName.textContent}</div>
            `;
        } else {
            // Fallback to cloning
            dragImage.innerHTML = element.innerHTML;
        }

        dragImage.style.cssText = `
            position: absolute;
            top: -1000px;
            left: -1000px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            padding: 8px;
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transform: rotate(3deg) scale(0.95);
            opacity: 0.9;
            z-index: 10000;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        `;

        // Add to document
        document.body.appendChild(dragImage);

        // Set the drag image with proper offset
        const offsetX = rect.width / 2;
        const offsetY = rect.height / 2;
        e.dataTransfer.setDragImage(dragImage, offsetX, offsetY);

        // Clean up
        setTimeout(() => {
            if (document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
            }
        }, 100);
    },

    handleDragEnd(e) {
        e.target.classList.remove('opacity-50');
        this.el.querySelectorAll('[data-drop-zone="true"]').forEach(zone => {
            this.highlightDropZone(zone, false, 'normal');
        });
        this.removeDropIndicator();
        this.draggedElement = null;
    },

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.updateDropIndicator(
            { x: e.clientX, y: e.clientY },
            e.currentTarget,
            this.draggedElement
        );
    },

    handleDragEnter(e) {
        e.preventDefault();
        if (e.currentTarget.dataset.dropZone) {
            this.highlightDropZone(e.currentTarget, true, 'normal');
        }
    },

    handleDragLeave(e) {
        if (e.currentTarget.dataset.dropZone && !e.currentTarget.contains(e.relatedTarget)) {
            this.highlightDropZone(e.currentTarget, false);
        }
    },

    handleDrop(e) {
        e.preventDefault();

        const objectId = e.dataTransfer.getData('text/plain');
        const targetTierId = e.currentTarget.dataset.tierId;

        this.highlightDropZone(e.currentTarget, false, 'normal');

        if (!objectId?.trim()) {
            console.error('Invalid objectId:', objectId);
            return;
        }

        const originalPosition = this.draggedElement ? parseInt(this.draggedElement.dataset.position) || 0 : -1;
        const originalTierId = this.draggedElement ? this.draggedElement.closest('[data-drop-zone="true"]')?.dataset.tierId : null;

        const position = this.calculateDropPosition(
            { x: e.clientX, y: e.clientY },
            e.currentTarget,
            this.draggedElement
        );

        this.performMove(objectId, targetTierId, position, originalPosition, originalTierId);
    },

    // =============================================================================
    // VISUAL FEEDBACK HELPERS
    // =============================================================================

    highlightDropZones(highlight) {
        this.el.querySelectorAll('[data-drop-zone="true"]').forEach(zone => {
            this.highlightDropZone(zone, highlight, 'background-only');
        });
    },

    highlightCurrentDropZone(currentZone) {
        this.el.querySelectorAll('[data-drop-zone="true"]').forEach(zone => {
            if (zone === currentZone) {
                this.highlightDropZone(zone, true, 'hover');
            } else {
                this.highlightDropZone(zone, true, 'background-only');
            }
        });
    },

    highlightDropZone(zone, highlight, type = 'normal') {
        if (!zone) return;

        const tierColor = zone.closest('.tier-row')?.style.backgroundColor || '#ffffff';

        if (highlight) {
            const lightenedColor = this.lightenColor(tierColor, type === 'hover' ? 0.3 : 0.2);
            zone.style.backgroundColor = lightenedColor;

            if (type === 'normal') {
                zone.style.border = '2px dashed rgba(59, 130, 246, 0.5)';
            } else if (type === 'hover') {
                zone.style.border = '2px solid #3b82f6';
                zone.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.3)';
            }
        } else {
            zone.style.backgroundColor = '';
            zone.style.border = '';
            zone.style.boxShadow = '';
        }
    },

    lightenColor(color, amount) {
        const colorMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!colorMatch) return color;

        const [, r, g, b] = colorMatch.map(Number);
        const lighten = (c) => Math.min(255, Math.round(c + (255 - c) * amount));

        return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`;
    }
};

export default TierListDragDrop; 