function getCBCookie(cName) {
	var i, x, y, arrCookies = document.cookie.split(";");
	for (i = 0; i < arrCookies.length; i++) {
		x = arrCookies[i].substr(0, arrCookies[i].indexOf("="));
		y = arrCookies[i].substr(arrCookies[i].indexOf("=") + 1);
		x = x.replace(/^\s+|\s+$/g, "");
		if (x == cName) {
			return unescape(y);
		}
	}
}

function setCBCookie(cName, value, exdays) {
	if(value !== undefined)
	{
		exdays = exdays != undefined ? exdays: 49;
		var date = new Date();
		date.setTime(date.getTime() + (exdays * 24 * 60 * 60 * 1000));
		var cValue = escape(value) + ";expires=" + date.toUTCString() + ";domain=" + window.location.hostname + ";path=/";
		document.cookie = cName + "=" + cValue;
	}
}

function delCBCookie(cName)
{
	setCBCookie(cName, '', 0);
};

function delCBCookieRegExp(regExp)
{
	let forDelete = document.cookie.match(regExp);
	forDelete && forDelete.forEach(cn=>delCBCookie(cn));
}