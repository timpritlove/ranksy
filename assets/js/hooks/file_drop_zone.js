const FileDropZone = {
    mounted() {
        this.setupFileDropZone();
    },

    setupFileDropZone() {
        const dropZone = this.el;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.highlight.bind(this), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.unhighlight.bind(this), false);
        });

        dropZone.addEventListener('drop', this.handleDrop.bind(this), false);
    },

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    highlight(e) {
        this.el.classList.add('border-blue-400', 'bg-blue-50');
    },

    unhighlight(e) {
        this.el.classList.remove('border-blue-400', 'bg-blue-50');
    },

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            // Find the LiveView file input and trigger the upload
            const fileInput = this.el.querySelector('input[type="file"]');
            if (fileInput) {
                // Create a new FileList-like object
                const dataTransfer = new DataTransfer();
                Array.from(files).forEach(file => dataTransfer.items.add(file));
                fileInput.files = dataTransfer.files;

                // Trigger change event to notify LiveView
                const event = new Event('input', { bubbles: true });
                fileInput.dispatchEvent(event);

                // Also trigger change event for good measure
                const changeEvent = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(changeEvent);
            }
        }
    }
};

export default FileDropZone; 