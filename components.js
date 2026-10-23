(function () {
    // Root-relative so the header and footer load from any depth, including the 404 page
    // GitHub Pages serves at missing nested URLs.
    function markCurrentPage(placeholder) {
        var path = window.location.pathname.replace(/index\.html$/, '');
        placeholder.querySelectorAll('nav a').forEach(function (link) {
            if (link.getAttribute('href') === path) link.setAttribute('aria-current', 'page');
        });
    }

    function loadComponent(id, file) {
        var placeholder = document.getElementById(id);
        if (!placeholder) return;
        fetch('/' + file)
            .then(function (response) {
                if (!response.ok) throw new Error('Failed to load ' + file);
                return response.text();
            })
            .then(function (html) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(html, 'text/html');
                while (placeholder.firstChild) {
                    placeholder.removeChild(placeholder.firstChild);
                }
                Array.from(doc.body.childNodes).forEach(function (node) {
                    placeholder.appendChild(document.importNode(node, true));
                });
                markCurrentPage(placeholder);
            })
            .catch(function () { /* fail silently — placeholder stays empty */ });
    }

    document.addEventListener('DOMContentLoaded', function () {
        loadComponent('header-placeholder', 'header.html');
        loadComponent('footer-placeholder', 'footer.html');
    });
})();
