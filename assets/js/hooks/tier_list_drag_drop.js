const TierListDragDrop = {
    mounted() {
        console.log('TierListDragDrop hook mounted! VERSION 2024-12-19-FIXED');
        this.setupDragAndDrop();
        this.initializeTouchSupport();
    },

    updated() {
        // Clean up any existing indicators before re-initializing
        this.removeDropIndicator();
        this.setupDragAndDrop();
        this.initializeTouchSupport();
    },

    destroyed() {
        // Clean up when component is destroyed
        this.removeDropIndicator();
        if (this.touchDragPreview) {
            this.touchDragPreview.remove();
            this.touchDragPreview = null;
        }

        // Remove all event listeners
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
            });
        }

        // Clean up any stray elements
        document.querySelectorAll('.drop-indicator, .touch-drag-preview').forEach(el => el.remove());
    },

    initializeTouchSupport() {
        // Touch-specific state
        this.touchState = {
            isDragging: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            draggedElement: null,
            dragThreshold: 8, // pixels to move before starting drag (reduced for easier initiation)
            longPressTimer: null,
            longPressDelay: 300, // ms for long press detection
            isLongPress: false
        };

        // Detect if device supports touch
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (this.isTouchDevice) {
            this.setupTouchEvents();
        }
    },

    setupTouchEvents() {
        // Remove existing touch listeners to avoid duplicates
        this.el.querySelectorAll('[data-draggable="true"]').forEach(item => {
            item.removeEventListener('touchstart', this.handleTouchStart);
            item.removeEventListener('touchmove', this.handleTouchMove);
            item.removeEventListener('touchend', this.handleTouchEnd);
            item.removeEventListener('contextmenu', this.handleContextMenu);
        });

        // Add touch event listeners to draggable items
        this.el.querySelectorAll('[data-draggable="true"]').forEach(item => {
            item.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            item.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            item.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

            // Prevent context menu on long press for draggable items
            item.addEventListener('contextmenu', this.handleContextMenu.bind(this), { passive: false });
        });
    },

    handleTouchStart(e) {
        const touch = e.touches[0];
        const draggableElement = e.target.closest('[data-object-id]');

        if (!draggableElement) return;

        console.log('Touch start detected on draggable element');

        // Store initial touch position and element
        this.touchState.startX = touch.clientX;
        this.touchState.startY = touch.clientY;
        this.touchState.currentX = touch.clientX;
        this.touchState.currentY = touch.clientY;
        this.touchState.draggedElement = draggableElement;
        this.touchState.isLongPress = false;

        // Add visual feedback immediately
        draggableElement.classList.add('touch-pressed');

        // Vibrate if supported (subtle feedback)
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }

        // Set up long press detection as a fallback
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

        // Determine if this is more of a horizontal or vertical movement
        const isHorizontalMovement = deltaX > deltaY;
        const isSignificantHorizontalMovement = deltaX > 15; // More lenient threshold for horizontal movement

        // If we've moved beyond threshold, start dragging
        // Allow both: primarily horizontal movement OR significant horizontal movement regardless of vertical
        if (!this.touchState.isDragging && distance > this.touchState.dragThreshold &&
            (isHorizontalMovement || isSignificantHorizontalMovement)) {

            // Prevent default only when we start dragging
            e.preventDefault();
            clearTimeout(this.touchState.longPressTimer);
            this.startTouchDrag(this.touchState.draggedElement);
        }

        // Update drag position if we're dragging
        if (this.touchState.isDragging) {
            e.preventDefault(); // Prevent scrolling while dragging
            this.updateTouchDrag(touch);
        }
    },

    handleTouchEnd(e) {
        // Clear long press timer
        clearTimeout(this.touchState.longPressTimer);

        // Remove visual feedback
        if (this.touchState.draggedElement) {
            this.touchState.draggedElement.classList.remove('touch-pressed');
        }

        if (this.touchState.isDragging) {
            e.preventDefault(); // Only prevent default if we were dragging
            this.completeTouchDrag(e);
        } else {
            // If it was a quick tap without dragging, treat as a regular tap

            // Still clean up any indicators that might have been created
            this.removeDropIndicator();
        }

        // Reset touch state
        this.resetTouchState();
    },

    handleContextMenu(e) {
        // Always prevent context menu on draggable items to avoid interference with long press drag
        const draggableElement = e.target.closest('[data-object-id]');
        if (draggableElement) {

            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    },

    startTouchDrag(element) {
        console.log('startTouchDrag called');

        this.touchState.isDragging = true;

        // Add dragging visual state
        element.classList.add('touch-dragging');
        element.classList.remove('touch-pressed');

        // Create touch-specific drag preview
        this.createTouchDragPreview(element);

        // Create or update drop indicator
        this.createDropIndicator();

        // Stronger vibration for drag start
        if (navigator.vibrate) {
            navigator.vibrate([20, 10, 20]);
        }

        // Highlight all drop zones
        this.highlightDropZones(true);
    },

    updateTouchDrag(touch) {
        if (!this.touchState.isDragging) return;

        // Update drag preview position
        if (this.touchDragPreview) {
            this.touchDragPreview.style.left = `${touch.clientX - 40}px`; // Center on finger
            this.touchDragPreview.style.top = `${touch.clientY - 40}px`;
        }

        // Find the drop zone under the touch point
        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropZone = elementUnderTouch?.closest('[data-drop-zone="true"]');

        if (dropZone) {
            // Update drop indicator for touch
            this.updateTouchDropIndicator(touch, dropZone);

            // Highlight current drop zone
            this.highlightCurrentDropZone(dropZone);
        }
    },

    completeTouchDrag(e) {
        console.log('completeTouchDrag called');

        const touch = e.changedTouches[0];
        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropZone = elementUnderTouch?.closest('[data-drop-zone="true"]');

        console.log('Drop zone found:', dropZone ? dropZone.dataset.tierId : 'none');

        if (dropZone && this.touchState.draggedElement) {
            const objectId = this.touchState.draggedElement.dataset.objectId;
            const targetTierId = dropZone.dataset.tierId;

            // Calculate position for touch drop
            const position = this.calculateTouchDropPosition(touch, dropZone);



            // Send event to LiveView
            this.pushEvent('move_object', {
                object_id: objectId,
                tier_id: targetTierId,
                position: position
            });

            // Success vibration
            if (navigator.vibrate) {
                navigator.vibrate([30, 20, 30]);
            }
        }

        // Clean up drag state - always do this regardless of success/failure
        this.cleanupTouchDrag();
    },

    calculateTouchDropPosition(touch, dropZone) {
        console.log('calculateTouchDropPosition called');

        const existingObjects = Array.from(dropZone.querySelectorAll('[data-object-id]'))
            .filter(obj => obj !== this.touchState.draggedElement);

        if (existingObjects.length === 0) {
            console.log('Empty tier, returning position 0');
            return 0;
        }

        const touchX = touch.clientX;
        const touchY = touch.clientY;

        // Sort objects by their database position (most reliable)
        const sortedObjects = existingObjects.sort((a, b) => {
            const posA = parseInt(a.dataset.position) || 0;
            const posB = parseInt(b.dataset.position) || 0;
            return posA - posB;
        });

        // Group objects by visual rows for touch targeting
        const rows = [];
        let currentRow = [];
        let lastTop = null;

        sortedObjects.forEach(obj => {
            const rect = obj.getBoundingClientRect();
            if (lastTop === null || Math.abs(rect.top - lastTop) <= 10) {
                // Same row
                currentRow.push({ element: obj, rect, position: parseInt(obj.dataset.position) || 0 });
                lastTop = rect.top;
            } else {
                // New row
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

        // Log current grid layout
        console.log('=== POSITION CALCULATION ===');
        console.log('Current grid layout:');
        rows.forEach((row, rowIndex) => {
            console.log(`  Row ${rowIndex}: [${row.map(obj => obj.position).join(', ')}]`);
        });

        // Find which row the touch is in
        let targetRow = null;
        let targetRowIndex = -1;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const firstRect = row[0].rect;

            // Check if touch Y is within this row's bounds (with some tolerance)
            if (touchY >= firstRect.top - 20 && touchY <= firstRect.bottom + 20) {
                targetRow = row;
                targetRowIndex = i;
                break;
            }
        }

        // If no specific row found, find the closest row
        if (!targetRow) {
            let minDistance = Infinity;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowCenterY = row[0].rect.top + (row[0].rect.height / 2);
                const distance = Math.abs(touchY - rowCenterY);

                if (distance < minDistance) {
                    minDistance = distance;
                    targetRow = row;
                    targetRowIndex = i;
                }
            }
        }

        console.log(`Target row: ${targetRowIndex} with positions [${targetRow.map(obj => obj.position).join(', ')}]`);

        // Find where to insert within the target row based on touch X position
        let insertPosition = sortedObjects.length; // Default to end

        if (targetRow) {
            // Find insertion point within the target row based on X position
            let targetObject = null;

            for (let i = 0; i < targetRow.length; i++) {
                const objRect = targetRow[i].rect;
                const objCenterX = objRect.left + objRect.width / 2;

                if (touchX < objCenterX) {
                    targetObject = targetRow[i];
                    break;
                }
            }

            if (targetObject) {
                // Insert before this object - use its database position as the target position
                insertPosition = targetObject.position;
                console.log(`Inserting before object at position ${targetObject.position} → final position: ${insertPosition}`);
            } else {
                // Insert after the last object in this row
                const lastInRow = targetRow[targetRow.length - 1];
                insertPosition = lastInRow.position + 1;
                console.log(`Inserting after last object in row (position ${lastInRow.position}) → final position: ${insertPosition}`);
            }
        }

        console.log('=== END POSITION CALCULATION ===');
        return insertPosition;
    },

    createTouchDragPreview(element) {
        // Create a visual preview that follows the finger
        this.touchDragPreview = element.cloneNode(true);
        this.touchDragPreview.classList.add('touch-drag-preview');
        this.touchDragPreview.style.cssText = `
            position: fixed;
            width: 80px;
            height: 80px;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.8;
            transform: scale(1.1) rotate(5deg);
            transition: none;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        `;

        document.body.appendChild(this.touchDragPreview);
    },

    updateTouchDropIndicator(touch, dropZone) {
        if (!this.dropIndicator) return;

        const existingObjects = Array.from(dropZone.querySelectorAll('[data-object-id]'))
            .filter(obj => obj !== this.touchState.draggedElement);

        const touchX = touch.clientX;
        const touchY = touch.clientY;

        let showIndicator = false;
        let indicatorX = 0;
        let indicatorY = 0;

        if (existingObjects.length === 0) {
            // Show indicator in drop zone
            const dropZoneRect = dropZone.getBoundingClientRect();
            indicatorX = dropZoneRect.left + 20;
            indicatorY = dropZoneRect.top + 10; // Start near the top of the drop zone
            const indicatorHeight = Math.max(60, dropZoneRect.height - 20); // Dynamic height
            this.dropIndicator.style.height = `${indicatorHeight}px`;
            showIndicator = true;
        } else {
            // Sort objects by their database position (most reliable)
            const sortedObjects = existingObjects.sort((a, b) => {
                const posA = parseInt(a.dataset.position) || 0;
                const posB = parseInt(b.dataset.position) || 0;
                return posA - posB;
            });

            // Group objects by rows to find which row the touch is in
            const rows = [];
            let currentRow = [];
            let lastTop = null;

            sortedObjects.forEach(obj => {
                const rect = obj.getBoundingClientRect();
                if (lastTop === null || Math.abs(rect.top - lastTop) <= 10) {
                    // Same row
                    currentRow.push({ element: obj, rect, position: parseInt(obj.dataset.position) || 0 });
                    lastTop = rect.top;
                } else {
                    // New row
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

            // Find which row the touch is in
            let targetRow = null;
            let targetRowIndex = -1;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const firstRect = row[0].rect;
                const lastRect = row[row.length - 1].rect;

                // Check if touch Y is within this row's bounds (with some tolerance)
                if (touchY >= firstRect.top - 20 && touchY <= firstRect.bottom + 20) {
                    targetRow = row;
                    targetRowIndex = i;
                    break;
                }
            }

            // If no specific row found, find the closest row
            if (!targetRow) {
                let minDistance = Infinity;
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const rowCenterY = row[0].rect.top + (row[0].rect.height / 2);
                    const distance = Math.abs(touchY - rowCenterY);

                    if (distance < minDistance) {
                        minDistance = distance;
                        targetRow = row;
                        targetRowIndex = i;
                    }
                }
            }

            // Find where to insert within the target row
            let insertPosition = sortedObjects.length; // Default to end
            let targetRect = null;

            if (targetRow) {
                // Calculate position within all objects up to this row
                let positionOffset = 0;
                for (let i = 0; i < targetRowIndex; i++) {
                    positionOffset += rows[i].length;
                }

                // Find insertion point within the target row
                let rowInsertPosition = targetRow.length; // Default to end of row

                for (let i = 0; i < targetRow.length; i++) {
                    const objRect = targetRow[i].rect;
                    const objCenterX = objRect.left + objRect.width / 2;

                    if (touchX < objCenterX) {
                        rowInsertPosition = i;
                        targetRect = objRect;
                        break;
                    }
                }

                insertPosition = positionOffset + rowInsertPosition;

                // If inserting at end of row, use the last object's rect for positioning
                if (!targetRect && targetRow.length > 0) {
                    targetRect = targetRow[targetRow.length - 1].rect;
                }
            }

            // Position the indicator
            if (targetRect) {
                // Insert before this object
                indicatorX = targetRect.left - 8;
                indicatorY = targetRect.top;
                const indicatorHeight = targetRect.height;
                this.dropIndicator.style.height = `${indicatorHeight}px`;
                showIndicator = true;
            } else if (targetRow && targetRow.length > 0) {
                // Insert at the end of the target row
                const lastInRow = targetRow[targetRow.length - 1];
                indicatorX = lastInRow.rect.right + 8;
                indicatorY = lastInRow.rect.top;
                const indicatorHeight = lastInRow.rect.height;
                this.dropIndicator.style.height = `${indicatorHeight}px`;
                showIndicator = true;
            } else if (sortedObjects.length > 0) {
                // Fallback: insert at the end of all objects
                const lastRect = sortedObjects[sortedObjects.length - 1].getBoundingClientRect();
                indicatorX = lastRect.right + 8;
                indicatorY = lastRect.top;
                const indicatorHeight = lastRect.height;
                this.dropIndicator.style.height = `${indicatorHeight}px`;
                showIndicator = true;
            }
        }

        if (showIndicator && this.touchState.isDragging) {
            this.dropIndicator.style.display = 'block';
            this.dropIndicator.style.left = `${indicatorX}px`;
            this.dropIndicator.style.top = `${indicatorY}px`;
            this.dropIndicator.style.opacity = '1';
        } else {
            this.dropIndicator.style.display = 'none';
            this.dropIndicator.style.opacity = '0';
        }
    },

    highlightDropZones(highlight) {
        this.el.querySelectorAll('[data-drop-zone="true"]').forEach(zone => {
            this.highlightDropZone(zone, highlight, 'background-only');
        });
    },

    highlightCurrentDropZone(currentZone) {
        // Remove hover from all zones
        this.el.querySelectorAll('[data-drop-zone="true"]').forEach(zone => {
            this.highlightDropZone(zone, false, 'hover');
        });

        // Add hover to current zone
        if (currentZone) {
            this.highlightDropZone(currentZone, true, 'hover');
        }
    },

    highlightDropZone(zone, highlight, type = 'normal') {
        if (!zone) return;

        // Remove any existing highlight
        zone.style.removeProperty('background-color');
        zone.style.removeProperty('border');
        zone.style.removeProperty('box-shadow');
        zone.classList.remove('drop-zone-highlighted');

        if (highlight) {
            // Find the tier row to get the background color
            const tierRow = zone.closest('.tier-row');
            let baseColor = '#f3f4f6'; // Default gray for holding zone

            if (tierRow && tierRow.style.backgroundColor) {
                baseColor = tierRow.style.backgroundColor;
            }

            // Convert the base color to a lighter version
            const lightColor = this.lightenColor(baseColor, type === 'hover' ? 0.3 : 0.2);

            zone.style.backgroundColor = lightColor;

            // Only add borders and shadows for specific types
            if (type === 'hover') {
                zone.style.border = '2px solid rgba(59, 130, 246, 0.6)';
                zone.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.3)';
            } else if (type === 'normal') {
                zone.style.border = '2px dashed rgba(59, 130, 246, 0.4)';
            }
            // For 'background-only' type, we don't add any border or shadow

            zone.classList.add('drop-zone-highlighted');
        }
    },

    lightenColor(color, amount) {
        // Handle rgb() format
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);

            const newR = Math.min(255, Math.round(r + (255 - r) * amount));
            const newG = Math.min(255, Math.round(g + (255 - g) * amount));
            const newB = Math.min(255, Math.round(b + (255 - b) * amount));

            return `rgb(${newR}, ${newG}, ${newB})`;
        }

        // Handle hex format
        const hexMatch = color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (hexMatch) {
            const r = parseInt(hexMatch[1], 16);
            const g = parseInt(hexMatch[2], 16);
            const b = parseInt(hexMatch[3], 16);

            const newR = Math.min(255, Math.round(r + (255 - r) * amount));
            const newG = Math.min(255, Math.round(g + (255 - g) * amount));
            const newB = Math.min(255, Math.round(b + (255 - b) * amount));

            return `rgb(${newR}, ${newG}, ${newB})`;
        }

        // Fallback to a light blue if we can't parse the color
        return amount > 0.25 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)';
    },

    cleanupTouchDrag() {


        // Remove drag preview
        if (this.touchDragPreview) {

            this.touchDragPreview.remove();
            this.touchDragPreview = null;
        }

        // Remove drop indicator
        this.removeDropIndicator();

        // Remove drag visual states
        if (this.touchState.draggedElement) {
            this.touchState.draggedElement.classList.remove('touch-dragging');
        }

        // Remove drop zone highlights
        this.highlightDropZones(false);

        // Also clean up any remaining highlights
        this.el.querySelectorAll('.drop-zone-highlighted').forEach(zone => {
            this.highlightDropZone(zone, false, 'any');
        });

        // Also clean up any stray drag previews that might exist
        document.querySelectorAll('.touch-drag-preview').forEach(preview => {

            preview.remove();
        });

        // Force cleanup of any remaining drop indicators
        document.querySelectorAll('.drop-indicator').forEach(indicator => {

            indicator.remove();
        });
    },

    resetTouchState() {
        // Clean up any remaining drag elements before resetting state
        if (this.touchState.isDragging) {
            this.cleanupTouchDrag();
        }

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
    },

    setupDragAndDrop() {
        // Store bound functions to ensure we can remove them later
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

        // Remove existing event listeners to avoid duplicates
        this.el.querySelectorAll('[data-draggable]').forEach(item => {
            item.removeEventListener('dragstart', this.boundHandlers.dragStart);
            item.removeEventListener('dragend', this.boundHandlers.dragEnd);
        });

        // Remove existing drop zone listeners to avoid duplicates
        this.el.querySelectorAll('[data-drop-zone="true"]').forEach(zone => {
            zone.removeEventListener('dragover', this.boundHandlers.dragOver);
            zone.removeEventListener('drop', this.boundHandlers.drop);
            zone.removeEventListener('dragenter', this.boundHandlers.dragEnter);
            zone.removeEventListener('dragleave', this.boundHandlers.dragLeave);
        });

        // Make objects draggable (only if data-draggable="true")
        const draggableItems = this.el.querySelectorAll('[data-draggable="true"]');
        draggableItems.forEach((item, index) => {
            const objectId = item.dataset.objectId;

            // Only enable HTML5 drag and drop for non-touch devices or as fallback
            if (!this.isTouchDevice) {
                item.draggable = true;
                item.addEventListener('dragstart', this.boundHandlers.dragStart);
                item.addEventListener('dragend', this.boundHandlers.dragEnd);
            } else {
                // Disable HTML5 drag and drop on touch devices to prevent conflicts
                item.draggable = false;
            }
        });

        // Make drop zones (only if data-drop-zone="true")
        const dropZones = this.el.querySelectorAll('[data-drop-zone="true"]');

        dropZones.forEach(zone => {
            // Only add HTML5 drag events for non-touch devices
            if (!this.isTouchDevice) {
                zone.addEventListener('dragover', this.boundHandlers.dragOver);
                zone.addEventListener('drop', this.boundHandlers.drop);
                zone.addEventListener('dragenter', this.boundHandlers.dragEnter);
                zone.addEventListener('dragleave', this.boundHandlers.dragLeave);
            }
        });
    },

    handleDragStart(e) {
        console.log('=== DESKTOP DRAG START ===');

        // Find the closest element with data-object-id
        const draggableElement = e.target.closest('[data-object-id]');
        const objectId = draggableElement ? draggableElement.dataset.objectId : null;

        console.log('Drag start - objectId:', objectId);

        if (!objectId || objectId === '' || objectId === 'undefined') {
            console.error('No valid objectId found for dragged element');
            e.preventDefault();
            return;
        }

        e.dataTransfer.setData('text/plain', objectId);
        e.target.classList.add('opacity-50');
        e.dataTransfer.effectAllowed = 'move';

        // Set a custom drag image to prevent unwanted content from being included
        const dragImage = draggableElement.cloneNode(true);
        dragImage.style.transform = 'rotate(5deg)';
        dragImage.style.opacity = '0.8';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 40, 40);

        // Clean up the drag image after a short delay
        setTimeout(() => {
            if (document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
            }
        }, 0);

        // Store the dragged element for position calculation
        this.draggedElement = draggableElement;

        // Create and store the drop indicator
        this.createDropIndicator();
    },

    handleDragEnd(e) {
        e.target.classList.remove('opacity-50');
        // Remove all drop zone highlights (only from active drop zones)
        this.el.querySelectorAll('[data-drop-zone="true"]').forEach(zone => {
            this.highlightDropZone(zone, false, 'normal');
        });

        // Remove drop indicator
        this.removeDropIndicator();

        // Clear the dragged element reference
        this.draggedElement = null;
    },

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Update drop indicator position
        this.updateDropIndicator(e);
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

        console.log('=== DESKTOP DROP ===');
        console.log('objectId:', objectId, 'targetTierId:', targetTierId);
        console.log('TIMESTAMP:', Date.now(), 'to verify this is the current code');



        // Remove highlight
        this.highlightDropZone(e.currentTarget, false, 'normal');

        // Validate objectId before sending
        if (!objectId || objectId.trim() === '') {
            console.error('Invalid objectId:', objectId);
            return;
        }

        // Calculate the position based on where the drop occurred
        const position = this.calculateDropPosition(e, targetTierId);

        console.log('Calculated position:', position);

        // Get the original position of the dragged object
        const originalPosition = this.draggedElement ? parseInt(this.draggedElement.dataset.position) || 0 : -1;
        console.log('Original position of dragged object:', originalPosition);

        // The calculated position is based on the visual layout (without dragged object).
        // This position represents where we want to insert in the final layout.
        // No adjustment needed - the backend will handle the move correctly.

        let finalPosition = position;

        // Special case: if we calculated the same position as the original,
        // it means we're dropping in the same spot
        if (position === originalPosition) {
            console.log('Dropping in same position, skipping move');
            return;
        }

        console.log(`FIXED VERSION: Using calculated position ${position} as final position (no adjustment needed)`);
        finalPosition = position; // Fixed: removed faulty position adjustment logic

        // DEBUGGING: Log the exact values being sent
        console.log('SENDING TO BACKEND:', {
            object_id: objectId,
            tier_id: targetTierId,
            position: finalPosition,
            originalPosition: originalPosition
        });

        // Send event to LiveView
        this.pushEvent('move_object', {
            object_id: objectId,
            tier_id: targetTierId, // targetTierId should always be set now
            position: finalPosition
        });


    },

    calculateDropPosition(dropEvent, targetTierId) {
        console.log('=== DESKTOP POSITION CALCULATION ===');

        const dropZone = dropEvent.currentTarget;
        const allObjectsInTier = Array.from(dropZone.querySelectorAll('[data-object-id]'));

        console.log('All objects in tier:', allObjectsInTier.map(obj => ({
            id: obj.dataset.objectId,
            position: obj.dataset.position,
            isDragged: obj === this.draggedElement
        })));

        console.log('Dragged element:', this.draggedElement ? this.draggedElement.dataset.objectId : 'null');

        if (allObjectsInTier.length === 0) {
            console.log('Empty tier, returning position 0');
            return 0; // First object in the tier
        }

        // Sort ALL objects by their database position (including dragged object)
        const sortedObjects = allObjectsInTier.sort((a, b) => {
            const posA = parseInt(a.dataset.position) || 0;
            const posB = parseInt(b.dataset.position) || 0;
            return posA - posB;
        });

        console.log('Current objects in tier:', sortedObjects.map(obj => ({
            id: obj.dataset.objectId,
            position: obj.dataset.position
        })));

        // Get the drop coordinates
        const dropX = dropEvent.clientX;
        const dropY = dropEvent.clientY;

        console.log('Drop coordinates:', { dropX, dropY });

        // Group objects by visual rows (same logic as touch version)
        const rows = [];
        let currentRow = [];
        let lastTop = null;

        sortedObjects.forEach(obj => {
            // Skip the dragged object for visual layout calculation
            if (obj === this.draggedElement) return;

            const rect = obj.getBoundingClientRect();
            if (lastTop === null || Math.abs(rect.top - lastTop) <= 10) {
                // Same row
                currentRow.push({ element: obj, rect, position: parseInt(obj.dataset.position) || 0 });
                lastTop = rect.top;
            } else {
                // New row
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

        console.log('Desktop grid layout:');
        rows.forEach((row, rowIndex) => {
            console.log(`  Row ${rowIndex}: [${row.map(obj => obj.position).join(', ')}] (Y: ${row[0].rect.top})`);
        });

        // Find which row the drop is in
        let targetRow = null;
        let targetRowIndex = -1;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const firstRect = row[0].rect;

            // Check if drop Y is within this row's bounds (with some tolerance)
            if (dropY >= firstRect.top - 20 && dropY <= firstRect.bottom + 20) {
                targetRow = row;
                targetRowIndex = i;
                break;
            }
        }

        // If no specific row found, find the closest row
        if (!targetRow) {
            let minDistance = Infinity;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowCenterY = row[0].rect.top + (row[0].rect.height / 2);
                const distance = Math.abs(dropY - rowCenterY);

                if (distance < minDistance) {
                    minDistance = distance;
                    targetRow = row;
                    targetRowIndex = i;
                }
            }
        }

        console.log(`Target row: ${targetRowIndex} with positions [${targetRow.map(obj => obj.position).join(', ')}]`);

        // Find where to insert within the target row based on drop X position
        let insertPosition = sortedObjects.length; // Default to end

        if (targetRow) {
            // Find insertion point within the target row based on X position
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
                // Insert before this object - we want to take its position
                insertPosition = targetObject.position;
                console.log(`Inserting before object at position ${targetObject.position} → final position: ${insertPosition}`);
            } else {
                // Insert after the last object in this row
                const lastInRow = targetRow[targetRow.length - 1];
                insertPosition = lastInRow.position + 1;
                console.log(`Inserting after last object in row (position ${lastInRow.position}) → final position: ${insertPosition}`);
            }
        }



        console.log('=== END DESKTOP POSITION CALCULATION ===');
        return insertPosition;
    },

    createDropIndicator() {
        // Create a vertical line indicator
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

    removeDropIndicator() {
        if (this.dropIndicator) {

            this.dropIndicator.remove();
            this.dropIndicator = null;
        }

        // Also remove any stray indicators that might exist
        document.querySelectorAll('.drop-indicator').forEach(indicator => {
            if (indicator !== this.dropIndicator) {

                indicator.remove();
            }
        });
    },

    updateDropIndicator(dragEvent) {
        if (!this.dropIndicator || !this.draggedElement) return;

        const dropZone = dragEvent.currentTarget;
        const allObjectsInTier = Array.from(dropZone.querySelectorAll('[data-object-id]'));

        const dropX = dragEvent.clientX;
        const dropY = dragEvent.clientY;

        let showIndicator = false;
        let indicatorX = 0;
        let indicatorY = 0;

        if (allObjectsInTier.length === 0) {
            // Show indicator in the center of empty drop zone
            const dropZoneRect = dropZone.getBoundingClientRect();
            indicatorX = dropZoneRect.left + 20; // 20px from left edge
            indicatorY = dropZoneRect.top + 10;
            const indicatorHeight = Math.max(60, dropZoneRect.height - 20);
            this.dropIndicator.style.height = `${indicatorHeight}px`;
            showIndicator = true;
        } else {
            // Use the same row-aware logic as position calculation
            const sortedObjects = allObjectsInTier.sort((a, b) => {
                const posA = parseInt(a.dataset.position) || 0;
                const posB = parseInt(b.dataset.position) || 0;
                return posA - posB;
            });

            // Group objects by visual rows (skip dragged object)
            const rows = [];
            let currentRow = [];
            let lastTop = null;

            sortedObjects.forEach(obj => {
                if (obj === this.draggedElement) return;

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

            // Find target row
            let targetRow = null;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const firstRect = row[0].rect;
                if (dropY >= firstRect.top - 20 && dropY <= firstRect.bottom + 20) {
                    targetRow = row;
                    break;
                }
            }

            // If no specific row found, find closest row
            if (!targetRow && rows.length > 0) {
                let minDistance = Infinity;
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const rowCenterY = row[0].rect.top + (row[0].rect.height / 2);
                    const distance = Math.abs(dropY - rowCenterY);
                    if (distance < minDistance) {
                        minDistance = distance;
                        targetRow = row;
                    }
                }
            }

            if (targetRow) {
                // Find insertion point within the target row
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
                    // Position indicator to the left of this object
                    indicatorX = targetObject.rect.left - 8;
                    indicatorY = targetObject.rect.top;
                    const indicatorHeight = targetObject.rect.height;
                    this.dropIndicator.style.height = `${indicatorHeight}px`;
                    showIndicator = true;
                } else {
                    // Position at the end of this row
                    const lastInRow = targetRow[targetRow.length - 1];
                    indicatorX = lastInRow.rect.right + 8;
                    indicatorY = lastInRow.rect.top;
                    const indicatorHeight = lastInRow.rect.height;
                    this.dropIndicator.style.height = `${indicatorHeight}px`;
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
    }
};

export default TierListDragDrop; 