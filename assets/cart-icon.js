import { Component } from '@theme/component';
import { onAnimationEnd } from '@theme/utilities';
import { ThemeEvents, CartUpdateEvent } from '@theme/events';

/**
 * A custom element that displays a cart icon.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} cartBubble - The cart bubble element.
 * @property {HTMLElement} cartBubbleText - The cart bubble text element.
 * @property {HTMLElement} cartBubbleCount - The cart bubble count element.
 * @property {HTMLElement} [cartBubbleCountLabel] - Visually hidden cart count label for assistive tech.
 *
 * @extends {Component<Refs>}
 */
class CartIcon extends Component {
  requiredRefs = ['cartBubble', 'cartBubbleText', 'cartBubbleCount'];

  /** @type {number} */
  get currentCartCount() {
    return parseInt(this.refs.cartBubbleCount.textContent ?? '0', 10);
  }

  set currentCartCount(value) {
    this.refs.cartBubbleCount.textContent = value < 100 ? String(value) : '';
  }

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener(ThemeEvents.cartUpdate, this.onCartUpdate);
    this.ensureCartBubbleIsCorrect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener(ThemeEvents.cartUpdate, this.onCartUpdate);
  }

  /**
   * Handles the cart update event.
   * @param {CartUpdateEvent} event - The cart update event.
   */
  onCartUpdate = async (event) => {
    const itemCount = event.detail.data?.itemCount ?? 0;
    const comingFromProductForm = event.detail.data?.source === 'product-form-component';

    this.renderCartBubble(itemCount, comingFromProductForm);
  };

  /**
   * Renders the cart bubble.
   * @param {number} itemCount - The number of items in the cart.
   * @param {boolean} comingFromProductForm - Whether the cart update is coming from the product form.
   */
  renderCartBubble = async (itemCount, comingFromProductForm, animate = true) => {
    // If the cart update is coming from the product form, we add to the current cart count, otherwise we set the new cart count
    this.currentCartCount = comingFromProductForm ? this.currentCartCount + itemCount : itemCount;
    const count = Number.isFinite(this.currentCartCount) ? this.currentCartCount : 0;

    this.refs.cartBubbleCount.classList.toggle('hidden', count === 0);
    this.refs.cartBubble.classList.toggle('visually-hidden', count === 0);
    this.refs.cartBubble.classList.toggle('cart-bubble--animating', count > 0 && animate);
    this.classList.toggle('header-actions__cart-icon--has-cart', count > 0);
    this.updateAccessibleName(count);

    sessionStorage.setItem(
      'cart-count',
      JSON.stringify({
        value: String(count),
        timestamp: Date.now(),
      })
    );

    if (!animate) return;
    await onAnimationEnd(this.refs.cartBubbleText);

    this.refs.cartBubble.classList.remove('cart-bubble--animating');
  };

  /**
   * Keeps the cart control's accessible name in sync with the visible count.
   * VoiceOver reads aria-label on the parent link, which Liquid only renders once.
   * @param {number} count
   */
  updateAccessibleName(count) {
    const cartLabel = this.dataset.cartLabel || 'Cart';
    const cartCountLabel = this.dataset.cartCountLabel || 'Total items in cart';
    const accessibleName = `${cartLabel} ${cartCountLabel}: ${count}`;

    const trigger = this.closest('a, button');
    if (trigger instanceof HTMLElement) {
      trigger.setAttribute('aria-label', accessibleName);
    }

    const hiddenCount = this.refs.cartBubbleCountLabel;
    if (hiddenCount) {
      hiddenCount.textContent = `${cartCountLabel}: ${count}`;
    }
  }

  /**
   * Checks if the cart count is correct.
   */
  ensureCartBubbleIsCorrect = () => {
    const sessionStorageCount = sessionStorage.getItem('cart-count');
    const visibleCount = this.refs.cartBubbleCount.textContent;

    if (sessionStorageCount === visibleCount || sessionStorageCount === null) return;

    try {
      const { value, timestamp } = JSON.parse(sessionStorageCount);

      if (Date.now() - timestamp < 10000) {
        const count = parseInt(value, 10);

        if (count >= 0) {
          this.renderCartBubble(count, false, false);
        }
      }
    } catch (_) {
      // no-op
    }
  };
}

if (!customElements.get('cart-icon')) {
  customElements.define('cart-icon', CartIcon);
}
