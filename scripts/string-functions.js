function escapeRegex(str)
{
    return str.replace(/[\[\](){}?*+\^$\\.|\-]/g, "\\$&");
}

function trim(str, characters, flags)
{
    flags || (flags = "gi");
    characters = escapeRegex(characters);

    return str.replace(new RegExp("^[" + characters + "]+|[" + characters + "]+$", flags), '');
}

function sliceIntoChunks(array, chunk)
{
    // [1,2,3,4,5] => [ [1,2], [3,4], [5] ]
    return array.reduce((ar, it, i) =>
    { 
        const ix = Math.floor(i/chunk);
        if(!ar[ix]) ar[ix] = [];
        ar[ix].push(it);
        return ar;
    }, []);
}

function find(object, predicate) {
	let value;
	for (var key in object)
    {
		value = object[key];
		if (predicate(value, key))
        {
			return value;
		}
	}
	return undefined;
}

function filter(object, predicate)
{
    let val, arr = [];
	for (let key in object)
    {
		let = object[key];
		if (predicate(val, key))
        {
			arr.push(val);
		}
	}
	return arr;
}

/**Группирует значения свойств объекта по массивам в зависимости от результата вычисления заданной функции распределения*/
function group(object, by)
{
    let val, result = {};
	for (let key in object)
    {
		let = object[key];
		let gr = by(val, key);
        if(!result[gr]) result[gr] = [];
        result[gr].push(val);
	}
	return arr;
}

function hashCode(str)
{
	let hash = 0, i, chr, len;
	if (!str || str.length === 0) return hash;
	for (i = 0, len = str.length; i < len; i++)
	{
		chr = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash = hash | 0; // Convert to 32bit integer
	}
	return hash;
}

function guid()
{
  function s4()
  {
    return Math
      .floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}