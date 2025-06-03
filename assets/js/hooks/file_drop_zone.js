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

        // Add validation for file input changes (click selection)
        const fileInput = dropZone.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileInputChange.bind(this), false);
        }
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
            // Check file limit
            const maxFiles = parseInt(this.el.dataset.maxFiles);
            if (files.length > maxFiles) {
                this.showError(`Too many files selected. Maximum ${maxFiles} files allowed, but ${files.length} were selected.`);
                return;
            }

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
    },

    handleFileInputChange(e) {
        const files = e.target.files;
        const maxFiles = parseInt(this.el.dataset.maxFiles);

        if (files.length > maxFiles) {
            this.showError(`Too many files selected. Maximum ${maxFiles} files allowed, but ${files.length} were selected.`);
            // Clear the file input
            e.target.value = '';
            return false;
        }
    },

    showError(message) {
        // Remove any existing error messages
        const existingError = document.querySelector('.file-upload-error');
        if (existingError) {
            existingError.remove();
        }

        // Create and show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'file-upload-error mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2';
        errorDiv.textContent = message;

        // Insert after the drop zone
        this.el.parentNode.insertBefore(errorDiv, this.el.nextSibling);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
};

export default FileDropZone; 