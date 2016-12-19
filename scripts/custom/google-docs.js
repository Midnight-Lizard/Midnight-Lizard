(function googleDocsUnprintableAreaFix()
{
    let bgColor = calcMainBackgroundColor(1);
    var sheet = document.createElement('style');
	sheet.id = "cbUnprintableFixStyle";
	sheet.innerHTML = '.docs-ui-unprintable[style*="background-color: rgb(255, 255, 255)"]:not(important) {' +
		"background: " + bgColor + "!important;" +
		"}";
    document.head.appendChild(sheet);
})();