class StickyBuyButton extends HTMLElement {
    constructor() {
        super();
        this._onScroll = this._onScroll.bind(this);
        this._productForm = null;
        this._isVisible = false;
    }

    disconnectedCallback() {
        window.removeEventListener('scroll', this._onScroll);
    }

    _onScroll() {
        if (!this._productForm) return;
        const rect = this._productForm.getBoundingClientRect();
        const isOffScreen = rect.bottom <= 0;

        if (isOffScreen && !this._isVisible) {
            this.style.display = '';
            // Force reflow to enable transition
            void this.offsetWidth;
            this.style.opacity = '1';
            this._isVisible = true;
        } else if (!isOffScreen && this._isVisible) {
            this.style.opacity = '0';
            this._isVisible = false;
            // Hide after transition
            setTimeout(() => {
                if (!this._isVisible) this.style.display = 'none';
            }, 300);
        }
    }

    connectedCallback() {
        this.style.display = 'none';
        this.style.opacity = '0';
        this.style.transition = 'opacity 0.3s';
        this._productForm = document.querySelector('.shopify-product-form');
        if (!this._productForm) return;
        window.addEventListener('scroll', this._onScroll, { passive: true });
        this._onScroll();
    }
}

customElements.define('sticky-buy-button', StickyBuyButton);