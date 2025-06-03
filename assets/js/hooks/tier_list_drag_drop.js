const TierListDragDrop = {
    mounted() {
        this.setupDragAndDrop();
    },

    updated() {
        this.setupDragAndDrop();
    },

    setupDragAndDrop() {
        // Make objects draggable
        this.el.querySelectorAll('[data-draggable]').forEach(item => {
            item.draggable = true;
            item.addEventListener('dragstart', this.handleDragStart.bind(this));
            item.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        // Make tiers and holding zone drop targets
        this.el.querySelectorAll('[data-drop-zone]').forEach(zone => {
            zone.addEventListener('dragover', this.handleDragOver.bind(this));
            zone.addEventListener('drop', this.handleDrop.bind(this));
            zone.addEventListener('dragenter', this.handleDragEnter.bind(this));
            zone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    },

    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.objectId);
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
        const position = this.calculateDropPosition(e);

        // Remove highlight
        e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');

        // Send event to LiveView
        this.pushEvent('move_object', {
            object_id: objectId,
            tier_id: targetTierId,
            position: position
        });
    },

    calculateDropPosition(e) {
        // For now, just append to the end
        // Could be enhanced to calculate exact position based on drop coordinates
        return 0;
    }
};

export default TierListDragDrop; 