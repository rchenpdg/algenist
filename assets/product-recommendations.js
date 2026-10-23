import { RecentlyViewed } from '@theme/recently-viewed-products';
import { sectionRenderer } from '@theme/section-renderer';

class ProductRecommendations extends HTMLElement {
  /**
   * The observer for the product recommendations
   * @type {IntersectionObserver}
   */
  #intersectionObserver = new IntersectionObserver(
    (entries, observer) => {
      if (!entries[0]?.isIntersecting) return;

      observer.disconnect();
      this.#loadRecommendations();
    },
    { rootMargin: '0px 0px 400px 0px' }
  );

  /**
   * Observing changes to the elements attributes
   * @type {MutationObserver}
   */
  #mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Only attribute changes are interesting
      if (mutation.target !== this || mutation.type !== 'attributes') continue;

      // Ignore when the data-recommendations-performed attribute has been set to 'true'
      if (
        mutation.attributeName === 'data-recommendations-performed' &&
        this.dataset.recommendationsPerformed === 'true'
      )
        continue;

      // Ignore error state attributes set by #handleError / #hideEmptyRecommendations
      if (mutation.attributeName === 'data-error') continue;

      // All other attribute changes trigger a reload
      this.#loadRecommendations();
      break;
    }
  });

  /**
   * The cached recommendations
   * @type {Record<string, string>}
   */
  #cachedRecommendations = {};

  /**
   * An abort controller for the active fetch (if there is one)
   * @type {AbortController | null}
   */
  #activeFetch = null;

  connectedCallback() {
    this.#intersectionObserver.observe(this);
    this.#mutationObserver.observe(this, { attributes: true });
  }

  /**
   * Load the product recommendations
   */
  #loadRecommendations() {
    const { productId, recommendationsPerformed, sectionId, intent } = this.dataset;
    const id = this.id;

    if (!productId || !id) {
      throw new Error('Product ID and an ID attribute are required');
    }

    // If the recommendations have already been loaded, accounts for the case where the Theme Editor
    // is loaded the section from the editor's visual preview context.
    if (recommendationsPerformed === 'true') {
      return;
    }

    this.#fetchCachedRecommendations(productId, sectionId, intent)
      .then((result) => {
        if (!result.success) {
          // The Theme Editor will place a section element element in the DOM whose section_id is not available
          // to the Section Renderer API. In this case, we can safely ignore the error.
          if (!Shopify.designMode) {
            if (intent === 'recently_viewed') {
              this.#hideEmptyRecommendations();
            } else {
              this.#handleError(new Error(`Server returned ${result.status}`));
            }
          }
          return;
        }

        const html = document.createElement('div');
        html.innerHTML = result.data || '';
        const recommendations = html.querySelector(`product-recommendations[id="${id}"]`);

        if (recommendations?.innerHTML && recommendations.innerHTML.trim().length) {
          this.dataset.recommendationsPerformed = 'true';
          this.innerHTML = recommendations.innerHTML;
        } else if (intent === 'recently_viewed') {
          this.#hideEmptyRecommendations();
        } else {
          this.#handleError(new Error('No recommendations available'));
        }
      })
      .catch((e) => {
        this.#handleError(e);
      });
  }

  /**
   * Fetches the recommendations and cached the result for future use
   * @param {string} productId
   * @param {string | undefined} sectionId
   * @param {string | undefined} intent
   * @returns {Promise<{ success: true, data: string } | { success: false, status: number }>}
   */
  async #fetchCachedRecommendations(productId, sectionId, intent) {
    if (intent != 'recently_viewed') {
      const url = `${this.dataset.url}&product_id=${productId}&section_id=${sectionId}&intent=${intent}`;

      const cachedResponse = this.#cachedRecommendations[url];
      if (cachedResponse) {
        return { success: true, data: cachedResponse };
      }

      this.#activeFetch?.abort();
      this.#activeFetch = new AbortController();

      try {
        const response = await fetch(url, { signal: this.#activeFetch.signal });
        if (!response.ok) {
          return { success: false, status: response.status };
        }

        const text = await response.text();
        this.#cachedRecommendations[url] = text;
        return { success: true, data: text };
      } finally {
        this.#activeFetch = null;
      }
    } else {
      if (sectionId) {
        const viewedProducts = RecentlyViewed.getProducts();
        if (viewedProducts.length === 0) return { success: true, data: '' };

        const url = new URL(Theme.routes.search_url, location.origin);
        url.searchParams.set('q', viewedProducts.map(/** @param {string} id */ (id) => `id:${id}`).join(' OR '));
        url.searchParams.set('resources[type]', 'product');

        const cachedResponse = this.#cachedRecommendations[url.toString()];
        if (cachedResponse) {
          return { success: true, data: cachedResponse };
        }

        this.#activeFetch?.abort();
        this.#activeFetch = new AbortController();

        try {
          const text = await sectionRenderer.getSectionHTML(sectionId, false, url);
          this.#cachedRecommendations[url.toString()] = text;
          return { success: true, data: text };
        } finally {
          this.#activeFetch = null;
        }
      } else {
        return { success: false, status: 500 };
      }
    }
  }

  /**
   * Hide the section when there is nothing to show (e.g. empty recently viewed).
   */
  #hideEmptyRecommendations() {
    this.dataset.recommendationsPerformed = 'true';
    this.classList.add('hidden');
  }

  /**
   * Handle errors in a consistent way
   * @param {Error} error
   */
  #handleError(error) {
    console.error('Product recommendations error:', error);
    this.dataset.recommendationsPerformed = 'true';
    this.classList.add('hidden');
    this.dataset.error = 'Error loading product recommendations';
  }
}

if (!customElements.get('product-recommendations')) {
  customElements.define('product-recommendations', ProductRecommendations);
}
