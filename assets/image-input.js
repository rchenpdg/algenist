if (!customElements.get('image-input')) {
    customElements.define(
      'image-input',
      class ImageInput extends HTMLElement {
        constructor() {
            super();
            this.input = this.querySelector('input')
            this.bindEvents();
        }
  
        bindEvents() {
            this.input.addEventListener('input', this.onInputChange.bind(this))
        }
  
        onInputChange(event) {
            this.style.setProperty('--position', `${event.target.value / 10}%`)
        }
      }
    );
}