(function () {
    var isSubdir = window.location.pathname.includes('/blogs/');
    var base = isSubdir ? '../' : '';

    function loadComponent(id, file, fixLinks) {
        var placeholder = document.getElementById(id);
        if (!placeholder) return;
        fetch(base + file)
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
                if (fixLinks) {
                    placeholder.querySelectorAll('a[href^="../"]').forEach(function (link) {
                        link.setAttribute('href', link.getAttribute('href').substring(3));
                    });
                }
            })
            .catch(function () { /* fail silently — placeholder stays empty */ });
    }

    document.addEventListener('DOMContentLoaded', function () {
        loadComponent('header-placeholder', 'header.html', !isSubdir);
        loadComponent('footer-placeholder', 'footer.html', false);
    });
})();
