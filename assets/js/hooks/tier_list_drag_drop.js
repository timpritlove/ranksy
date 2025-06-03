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
    },

    handleDragEnd(e) {
        e.target.classList.remove('opacity-50');
        // Remove all drop zone highlights
        this.el.querySelectorAll('[data-drop-zone]').forEach(zone => {
            zone.classList.remove('bg-blue-50', 'border-blue-300');
        });
    },

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
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
        const position = 0;

        console.log('Drop event:', {
            objectId: objectId,
            targetTierId: targetTierId,
            position: position
        });

        // Remove highlight
        e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');

        // Validate objectId before sending
        if (!objectId || objectId.trim() === '') {
            console.error('Invalid objectId:', objectId);
            return;
        }

        // Send event to LiveView
        this.pushEvent('move_object', {
            object_id: objectId,
            tier_id: targetTierId,
            position: position
        });
    }
};

export default TierListDragDrop; 