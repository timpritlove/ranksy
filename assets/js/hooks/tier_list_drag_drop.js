const TierListDragDrop = {
    mounted() {
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
            console.log('Touch device detected, enabling enhanced touch support');
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

        console.log('Touch start on draggable element');

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
                console.log('Starting drag via long press');
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
            console.log('Starting drag via movement:', {
                distance,
                deltaX,
                deltaY,
                isHorizontalMovement,
                isSignificantHorizontalMovement
            });
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
            console.log('Quick tap detected - allowing normal behavior');
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
            console.log('Preventing context menu on draggable element');
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    },

    startTouchDrag(element) {
        console.log('Starting touch drag');

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
        console.log('Completing touch drag');

        const touch = e.changedTouches[0];
        const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropZone = elementUnderTouch?.closest('[data-drop-zone="true"]');

        if (dropZone && this.touchState.draggedElement) {
            const objectId = this.touchState.draggedElement.dataset.objectId;
            const targetTierId = dropZone.dataset.tierId;

            // Calculate position for touch drop
            const position = this.calculateTouchDropPosition(touch, dropZone);

            console.log('Touch drop:', { objectId, targetTierId, position });

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
        const existingObjects = Array.from(dropZone.querySelectorAll('[data-object-id]'))
            .filter(obj => obj !== this.touchState.draggedElement);

        if (existingObjects.length === 0) {
            console.log('Empty tier, inserting at position 0');
            return 0;
        }

        const touchX = touch.clientX;

        console.log('Touch drop position calculation:', {
            touchX,
            existingObjectsCount: existingObjects.length
        });

        // Sort objects by their position in the DOM (left to right, top to bottom)
        // This matches the visual indicator logic
        const sortedObjects = existingObjects.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();

            // First sort by row (top position), then by column (left position)
            if (Math.abs(rectA.top - rectB.top) > 10) { // 10px tolerance for same row
                return rectA.top - rectB.top;
            }
            return rectA.left - rectB.left;
        });

        // Find where to insert based on touch position
        let insertPosition = sortedObjects.length; // Default to end

        for (let i = 0; i < sortedObjects.length; i++) {
            const objRect = sortedObjects[i].getBoundingClientRect();
            const objCenterX = objRect.left + objRect.width / 2;

            console.log(`Sorted object ${i}:`, {
                objCenterX,
                objRect: { left: objRect.left, right: objRect.right, top: objRect.top, bottom: objRect.bottom },
                touchIsLeft: touchX < objCenterX
            });

            // If touch is to the left of this object's center, insert before it
            if (touchX < objCenterX) {
                insertPosition = i;
                console.log(`Inserting before sorted object ${i} (touch left of center)`);
                break;
            }
        }

        console.log('Final calculated position:', insertPosition);
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
            // Sort objects by their position in the DOM (left to right, top to bottom)
            const sortedObjects = existingObjects.sort((a, b) => {
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();

                // First sort by row (top position), then by column (left position)
                if (Math.abs(rectA.top - rectB.top) > 10) { // 10px tolerance for same row
                    return rectA.top - rectB.top;
                }
                return rectA.left - rectB.left;
            });

            // Find where to insert based on touch position
            let insertPosition = sortedObjects.length; // Default to end
            let targetRect = null;

            for (let i = 0; i < sortedObjects.length; i++) {
                const objRect = sortedObjects[i].getBoundingClientRect();
                const objCenterX = objRect.left + objRect.width / 2;

                // If touch is to the left of this object's center, insert before it
                if (touchX < objCenterX) {
                    insertPosition = i;
                    targetRect = objRect;
                    break;
                }
            }

            // Position the indicator
            if (insertPosition < sortedObjects.length && targetRect) {
                // Insert before this object
                indicatorX = targetRect.left - 8;
                indicatorY = targetRect.top;
                const indicatorHeight = targetRect.height;
                this.dropIndicator.style.height = `${indicatorHeight}px`;
                showIndicator = true;
            } else {
                // Insert at the end
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
        console.log('Cleaning up touch drag');

        // Remove drag preview
        if (this.touchDragPreview) {
            console.log('Removing touch drag preview');
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
            console.log('Removing stray drag preview');
            preview.remove();
        });

        // Force cleanup of any remaining drop indicators
        document.querySelectorAll('.drop-indicator').forEach(indicator => {
            console.log('Removing stray drop indicator');
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
        console.log('=== SETUP DRAG AND DROP ===');
        console.log('Hook element:', this.el);

        // Remove existing event listeners to avoid duplicates
        this.el.querySelectorAll('[data-draggable]').forEach(item => {
            item.removeEventListener('dragstart', this.handleDragStart);
            item.removeEventListener('dragend', this.handleDragEnd);
        });

        // Make objects draggable (only if data-draggable="true")
        const draggableItems = this.el.querySelectorAll('[data-draggable="true"]');
        console.log('Setting up drag and drop for', draggableItems.length, 'items');

        draggableItems.forEach((item, index) => {
            const objectId = item.dataset.objectId;
            console.log(`Item ${index}:`, {
                element: item,
                objectId: objectId,
                objectIdType: typeof objectId
            });

            // Only enable HTML5 drag and drop for non-touch devices or as fallback
            if (!this.isTouchDevice) {
                item.draggable = true;
                item.addEventListener('dragstart', this.handleDragStart.bind(this));
                item.addEventListener('dragend', this.handleDragEnd.bind(this));
            } else {
                // Disable HTML5 drag and drop on touch devices to prevent conflicts
                item.draggable = false;
            }
        });

        // Make drop zones (only if data-drop-zone="true")
        const dropZones = this.el.querySelectorAll('[data-drop-zone="true"]');
        console.log('Setting up', dropZones.length, 'drop zones');

        dropZones.forEach(zone => {
            // Only add HTML5 drag events for non-touch devices
            if (!this.isTouchDevice) {
                zone.addEventListener('dragover', this.handleDragOver.bind(this));
                zone.addEventListener('drop', this.handleDrop.bind(this));
                zone.addEventListener('dragenter', this.handleDragEnter.bind(this));
                zone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            }
        });
    },

    handleDragStart(e) {
        console.log('=== DRAG START EVENT TRIGGERED ===');

        // Find the closest element with data-object-id
        const draggableElement = e.target.closest('[data-object-id]');
        const objectId = draggableElement ? draggableElement.dataset.objectId : null;

        console.log('Drag start:', {
            objectId: objectId,
            target: e.target,
            draggableElement: draggableElement
        });

        if (!objectId || objectId === '' || objectId === 'undefined') {
            console.error('No valid objectId found for dragged element');
            e.preventDefault();
            return;
        }

        e.dataTransfer.setData('text/plain', objectId);
        e.target.classList.add('opacity-50');
        e.dataTransfer.effectAllowed = 'move';

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

        console.log('Drop event:', {
            objectId: objectId,
            targetTierId: targetTierId,
            dropTarget: e.currentTarget
        });

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

        // Send event to LiveView
        this.pushEvent('move_object', {
            object_id: objectId,
            tier_id: targetTierId, // targetTierId should always be set now
            position: position
        });
    },

    calculateDropPosition(dropEvent, targetTierId) {
        const dropZone = dropEvent.currentTarget;
        const existingObjects = Array.from(dropZone.querySelectorAll('[data-object-id]'))
            .filter(obj => obj !== this.draggedElement); // Exclude the dragged element

        if (existingObjects.length === 0) {
            return 0; // First object in the tier
        }

        // Get the drop coordinates
        const dropX = dropEvent.clientX;
        const dropY = dropEvent.clientY;

        // Find the best insertion point
        let insertPosition = existingObjects.length; // Default to end

        for (let i = 0; i < existingObjects.length; i++) {
            const objRect = existingObjects[i].getBoundingClientRect();
            const objCenterX = objRect.left + objRect.width / 2;
            const objCenterY = objRect.top + objRect.height / 2;

            // Check if we should insert before this object
            // For horizontal layout: check if drop is to the left of the object center
            // For vertical wrapping: also consider Y position
            if (dropX < objCenterX || (dropY < objCenterY && dropX < objRect.right)) {
                insertPosition = i;
                break;
            }
        }

        console.log('Position calculation:', {
            dropX,
            dropY,
            existingObjectsCount: existingObjects.length,
            insertPosition
        });

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
            console.log('Removing drop indicator');
            this.dropIndicator.remove();
            this.dropIndicator = null;
        }

        // Also remove any stray indicators that might exist
        document.querySelectorAll('.drop-indicator').forEach(indicator => {
            if (indicator !== this.dropIndicator) {
                console.log('Removing additional drop indicator');
                indicator.remove();
            }
        });
    },

    updateDropIndicator(dragEvent) {
        if (!this.dropIndicator || !this.draggedElement) return;

        const dropZone = dragEvent.currentTarget;
        const existingObjects = Array.from(dropZone.querySelectorAll('[data-object-id]'))
            .filter(obj => obj !== this.draggedElement);

        const dropX = dragEvent.clientX;
        const dropY = dragEvent.clientY;

        let showIndicator = false;
        let indicatorX = 0;
        let indicatorY = 0;

        if (existingObjects.length === 0) {
            // Show indicator in the center of empty drop zone
            const dropZoneRect = dropZone.getBoundingClientRect();
            indicatorX = dropZoneRect.left + 20; // 20px from left edge
            indicatorY = dropZoneRect.top + 10;
            const indicatorHeight = Math.max(60, dropZoneRect.height - 20);
            this.dropIndicator.style.height = `${indicatorHeight}px`;
            showIndicator = true;
        } else {
            // Find the best insertion point and position the indicator
            let insertionFound = false;

            for (let i = 0; i < existingObjects.length; i++) {
                const objRect = existingObjects[i].getBoundingClientRect();
                const objCenterX = objRect.left + objRect.width / 2;
                const objCenterY = objRect.top + objRect.height / 2;

                // Check if we should insert before this object
                if (dropX < objCenterX || (dropY < objCenterY && dropX < objRect.right)) {
                    // Position indicator to the left of this object
                    indicatorX = objRect.left - 8; // 8px to the left
                    indicatorY = objRect.top;
                    const indicatorHeight = objRect.height;
                    this.dropIndicator.style.height = `${indicatorHeight}px`;
                    showIndicator = true;
                    insertionFound = true;
                    break;
                }
            }

            // If no insertion point found, position at the end
            if (!insertionFound) {
                const lastObjRect = existingObjects[existingObjects.length - 1].getBoundingClientRect();
                indicatorX = lastObjRect.right + 8; // 8px to the right of last object
                indicatorY = lastObjRect.top;
                const indicatorHeight = lastObjRect.height;
                this.dropIndicator.style.height = `${indicatorHeight}px`;
                showIndicator = true;
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