/**
 * Back in Stock Modal Component
 * Handles the Klaviyo back-in-stock subscription modal
 */

class BackInStockModal extends HTMLElement {
  constructor() {
    super();
    this.dialog = this.querySelector('[ref="dialog"]');
    this.closeButton = this.querySelector('[ref="closeButton"]');
    this.form = this.querySelector('[ref="form"]');
    this.emailInput = this.querySelector('[ref="emailInput"]');
    this.variantIdInput = this.querySelector('[ref="variantId"]');
    this.productNameEl = this.querySelector('[ref="productName"]');
    this.variantNameEl = this.querySelector('[ref="variantName"]');
    this.submitButton = this.querySelector('[ref="submitButton"]');
    this.submitText = this.querySelector('[ref="submitText"]');
    this.loadingIndicator = this.querySelector('[ref="loadingIndicator"]');
    this.successMessage = this.querySelector('[ref="successMessage"]');
    this.errorMessage = this.querySelector('[ref="errorMessage"]');

    this.klaviyoApiKey = this.dataset.klaviyoApiKey;

    this.bindEvents();
  }

  bindEvents() {
    // Close button
    this.closeButton?.addEventListener('click', () => this.closeDialog());

    // Close on backdrop click
    this.dialog?.addEventListener('click', (e) => {
      if (e.target === this.dialog) {
        this.closeDialog();
      }
    });

    // Close on escape key
    this.dialog?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDialog();
      }
    });

    // Form submission
    this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  openDialog(variantId, productName, variantName) {
    // Reset form state
    this.resetForm();

    // Set variant info
    this.variantIdInput.value = variantId;
    this.productNameEl.textContent = productName || '';
    this.variantNameEl.textContent = variantName || '';

    // Show/hide variant name if same as product or empty
    if (!variantName || variantName === 'Default Title' || variantName === productName) {
      this.variantNameEl.hidden = true;
    } else {
      this.variantNameEl.hidden = false;
    }

    // Open dialog
    this.dialog?.showModal();

    // Focus email input
    setTimeout(() => {
      this.emailInput?.focus();
    }, 100);
  }

  closeDialog() {
    this.dialog?.classList.add('dialog-closing');

    this.dialog?.addEventListener(
      'animationend',
      () => {
        this.dialog?.classList.remove('dialog-closing');
        this.dialog?.close();
      },
      { once: true }
    );
  }

  resetForm() {
    this.form?.reset();
    this.successMessage.hidden = true;
    this.errorMessage.hidden = true;
    this.submitButton.disabled = false;
    this.submitText.hidden = false;
    this.loadingIndicator.hidden = true;
    this.form.hidden = false;
  }

  async handleSubmit(e) {
    e.preventDefault();

    const email = this.emailInput?.value?.trim();
    const variantId = this.variantIdInput?.value;

    if (!email || !variantId) {
      return;
    }

    // Show loading state
    this.setLoading(true);
    this.successMessage.hidden = true;
    this.errorMessage.hidden = true;

    try {
      await this.subscribeToBackInStock(email, variantId);

      // Show success
      this.successMessage.hidden = false;
      this.form.hidden = true;

      // Close modal after delay
      // setTimeout(() => {
      //   this.closeDialog();
      // }, 3000);
    } catch (error) {
      console.error('Back in stock subscription error:', error);
      this.errorMessage.hidden = false;
      this.setLoading(false);
    }
  }

  setLoading(isLoading) {
    this.submitButton.disabled = isLoading;
    this.submitText.hidden = isLoading;
    this.loadingIndicator.hidden = !isLoading;
  }

  async subscribeToBackInStock(email, variantId) {
    const endpoint = `https://a.klaviyo.com/client/back-in-stock-subscriptions/?company_id=${this.klaviyoApiKey}`;

    const payload = {
      data: {
        type: 'back-in-stock-subscription',
        attributes: {
          profile: {
            data: {
              type: 'profile',
              attributes: {
                email: email,
              },
            },
          },
          channels: ['EMAIL'],
        },
        relationships: {
          variant: {
            data: {
              type: 'catalog-variant',
              id: `$shopify:::$default:::${variantId}`,
            },
          },
        },
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        revision: '2024-06-15',
      },
      body: JSON.stringify(payload),
    });

    // Klaviyo returns 202 on success with no body
    if (!response.ok && response.status !== 202) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Subscription failed');
    }

    return true;
  }
}

// Register the custom element
if (!customElements.get('back-in-stock-modal')) {
  customElements.define('back-in-stock-modal', BackInStockModal);
}

/**
 * Back in Stock Button Component
 * Triggers the back-in-stock modal
 */
class BackInStockButton extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('button');
    this.variantId = this.dataset.variantId;
    this.productName = this.dataset.productName;
    this.variantName = this.dataset.variantName;

    this.bindEvents();
  }

  bindEvents() {
    this.button?.addEventListener('click', () => this.openModal());
  }

  openModal() {
    const modal = document.querySelector('back-in-stock-modal');
    if (modal) {
      modal.openDialog(this.variantId, this.productName, this.variantName);
    }
  }

  // Update variant when selection changes (for PDP)
  updateVariant(variantId, variantName) {
    this.variantId = variantId;
    this.variantName = variantName;
    this.dataset.variantId = variantId;
    this.dataset.variantName = variantName;
  }
}

// Register the custom element
if (!customElements.get('back-in-stock-button')) {
  customElements.define('back-in-stock-button', BackInStockButton);
}
