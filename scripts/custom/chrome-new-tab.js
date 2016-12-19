if(curSet && curSet.runOnThisSite && curSet.isEnabled)
{
	var sheet = document.createElement('style');
	sheet.id = "cbNewTabStyle";
	sheet.innerHTML = "";

	sheet.innerHTML += "#mv-single {" +
		"filter: brightness(" + curSet.imageLightnessLimit + ") saturate(" + curSet.imageSaturationLimit + ") !important;" +
		"}";

	document.documentElement.appendChild(sheet);
}