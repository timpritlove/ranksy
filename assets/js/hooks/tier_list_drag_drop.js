const TierListDragDrop = {
    mounted() {
        this.setupDragAndDrop();
    },

    updated() {
        this.setupDragAndDrop();
    },

    setupDragAndDrop() {
        console.log('=== SETUP DRAG AND DROP ===');
        console.log('Hook element:', this.el);

        // Remove existing event listeners to avoid duplicates
        this.el.querySelectorAll('[data-draggable]').forEach(item => {
            item.removeEventListener('dragstart', this.handleDragStart);
            item.removeEventListener('dragend', this.handleDragEnd);
        });

        // Make objects draggable
        const draggableItems = this.el.querySelectorAll('[data-draggable]');
        console.log('Setting up drag and drop for', draggableItems.length, 'items');

        draggableItems.forEach((item, index) => {
            const objectId = item.dataset.objectId;
            console.log(`Item ${index}:`, {
                element: item,
                objectId: objectId,
                objectIdType: typeof objectId
            });

            item.draggable = true;
            item.addEventListener('dragstart', this.handleDragStart.bind(this));
            item.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        // Make drop zones
        const dropZones = this.el.querySelectorAll('[data-drop-zone]');
        console.log('Setting up', dropZones.length, 'drop zones');

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', this.handleDragOver.bind(this));
            zone.addEventListener('drop', this.handleDrop.bind(this));
            zone.addEventListener('dragenter', this.handleDragEnter.bind(this));
            zone.addEventListener('dragleave', this.handleDragLeave.bind(this));
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
        // Remove all drop zone highlights
        this.el.querySelectorAll('[data-drop-zone]').forEach(zone => {
            zone.classList.remove('bg-blue-50', 'border-blue-300');
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
            e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
        }
    },

    handleDragLeave(e) {
        if (e.currentTarget.dataset.dropZone && !e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
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
        e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');

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
            position: absolute;
            width: 3px;
            height: 100px;
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
            indicatorY = dropZoneRect.top + (dropZoneRect.height / 2) - 50;
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
                    indicatorY = objRect.top + (objRect.height / 2) - 50; // Center vertically
                    showIndicator = true;
                    insertionFound = true;
                    break;
                }
            }

            // If no insertion point found, position at the end
            if (!insertionFound) {
                const lastObjRect = existingObjects[existingObjects.length - 1].getBoundingClientRect();
                indicatorX = lastObjRect.right + 8; // 8px to the right of last object
                indicatorY = lastObjRect.top + (lastObjRect.height / 2) - 50;
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
        }
    }
};

export default TierListDragDrop; 