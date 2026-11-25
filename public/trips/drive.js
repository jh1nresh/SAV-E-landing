(function () {
    if (window.self !== window.top) return;
    function startDrive() {
        window.setTimeout(function () {
            (function () {
                var script = document.createElement("script");
                script.async = 1;
                script.setAttribute("data-cmp-ab","2");
                script.src = 'https://tp-em.com/NjA1MjIx.js?t=605221';
                document.head.appendChild(script);
            })();
        }, 1000);
    }

    if (document.readyState === "complete") {
        startDrive();
    } else {
        window.addEventListener("load", startDrive, { once: true });
    }
})();
