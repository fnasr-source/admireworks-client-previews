(function initSearch() {
  const input = document.getElementById('searchInput');
  const grid = document.getElementById('previewGrid');
  const empty = document.getElementById('noResults');

  if (!input || !grid) {
    return;
  }

  const cards = Array.from(grid.querySelectorAll('[data-search]'));

  function applyFilter() {
    const query = input.value.trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const haystack = card.getAttribute('data-search') || '';
      const isVisible = !query || haystack.includes(query);
      card.hidden = !isVisible;
      if (isVisible) {
        visibleCount += 1;
      }
    });

    if (empty) {
      empty.hidden = visibleCount !== 0;
    }
  }

  input.addEventListener('input', applyFilter);
  applyFilter();
})();
