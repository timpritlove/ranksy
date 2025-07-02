const AutoResizeTextarea = {
  mounted() {
    const textarea = this.el;
    const form = textarea.form;
    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };
    textarea.addEventListener('input', resize);
    // Prevent newlines and submit on Enter
    textarea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (form) form.requestSubmit();
      }
    });
    // Initial resize
    resize();
  },
  updated() {
    // In case LiveView updates the value
    const textarea = this.el;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  },
  destroyed() {
    this.el.removeEventListener('input', this.resize);
  }
};

export default AutoResizeTextarea; 