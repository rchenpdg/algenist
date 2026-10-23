class ProductNavigation extends HTMLElement {
    constructor() {
      super();
    }

    intersectionObserverCallback(entries, observer) {
      entries.forEach((entry) => {
        if (!entry.isIntersecting && entry.boundingClientRect.bottom < 60) {
          this.classList.add('active');
          this.classList.remove('nav-hidden');
        } else {
          this.classList.remove('active');
        }
      });
    }

    handleTransitionEnd(event) {
        if (event.propertyName == "opacity") {
          if (!this.classList.contains('active')) {
            this.classList.add('nav-hidden')
          }
        }
    }

    connectedCallback() {
        const options = {
          rootMargin: "-60px 0px 100px 0px",
        };

        this.intersectionObserver = new IntersectionObserver(this.intersectionObserverCallback.bind(this), options);

        this.productInfoAddToCartEl = document.querySelector('.section.product-information .add-to-cart-button');
        if(this.productInfoAddToCartEl) {
          this.intersectionObserver.observe(this.productInfoAddToCartEl);
        }

        this.addEventListener("transitionend", this.handleTransitionEnd.bind(this));
    }

    disconnectedCallback() {
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
      }

      this.removeEventListener("transitionend", this.handleTransitionEnd.bind(this));
    }
  }

  customElements.define('product-navigation', ProductNavigation);
