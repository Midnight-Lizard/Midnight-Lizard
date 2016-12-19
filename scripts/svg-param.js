var svgns = "http://www.w3.org/2000/svg";
var xlinkns = "http://www.w3.org/1999/xlink";
//alert("svg-param");
GetParams();

function GetParams()
{
  var uids = [];

  var paramArray = [];
  if ( document.defaultView.frameElement )
  {
     var params = document.defaultView.frameElement.getElementsByTagName("param");

     for ( var i = 0, iLen = params.length; iLen > i; i++ )
     {
        var eachParam = params[ i ];
        var name = eachParam.getAttribute( "name" );
        var value = eachParam.getAttribute( "value" );
        
        paramArray[ name ] = value;
     }
  }

  var href = document.defaultView.location.href;
  if ( -1 != href.indexOf("?") )
  {
    var paramList = href.split("?")[1].split(/&|;/);
    for ( var p = 0, pLen = paramList.length; pLen > p; p++ )
    {
       var eachParam = paramList[ p ];
       var valList = eachParam.split("=");
       var name = unescape(valList[0]);
       var value = unescape(valList[1]);

       paramArray[ name ] = value;
     }
  }

  SetElementValues( paramArray, uids );
}


function GetValue( attrStr, params )
{
  // parse attribute value for parameter reference and fallback value 
  var paramSplit = attrStr.split(")");
  var paramName = paramSplit[0].replace("param(","");
  var defaultVal = null;
  if (paramSplit[1])
  {
    defaultVal = paramSplit[1].replace(/^\s\s*/, "").replace(/\s\s*$/, "");
  }
  
  var newVal = params[ paramName ];
  if ( !newVal )
  {
    newVal = defaultVal;  
  }

  return newVal;
}


function SetElementValues( params, uids  )
{
  var useEls =[];
  var elList = document.documentElement.getElementsByTagName( "*" );
  for ( var i = 0, iLen = elList.length; iLen > i; i++ )
  {
    var eachEl = elList[ i ];
    if ( "use" != eachEl.localName )
    {
      SetParamValues( eachEl, params );
    }
    else
    {
      var shadow = EmulateShadowTree( eachEl, params, uids, i );
      if ( shadow )
      {
        useEls.push( [ eachEl, shadow ] );
      }
    }
  }
    
  for ( var u = 0, uLen = useEls.length; uLen > u; u++ )
  {
    var useEl = useEls[ u ][0];
    var shadow = useEls[ u ][1];
    useEl.setAttribute("display", "none");
    if (useEl.nextSibling)
    {
      useEl.parentNode.insertBefore(shadow, useEl.nextSibling);
    }
    else
    {
      useEl.parentNode.appendChild(shadow);
    }
  }
}


function SetParamValues( el, params, isShadow )
{
  for ( var a = 0, aLen = el.attributes.length; aLen > a; a++ )
  {
    var attr = el.attributes[ a ];
    if (attr)
    {
      var attrVal = attr.value;
    
      if ( -1 != attrVal.indexOf( "param(" ) )
      {
        //alert("attr: " + attr.localName + "\nvalue: " + attrVal)
        if ( "params" == attr.localName )
        {
          // alert("attr.name: " + attr.name + "\nattrVal: " + attrVal + "\nisShadow: " + isShadow)
          if (isShadow)
          {
            //alert(attrVal)
            var paramSplit = attrVal.split(";");
            for ( var p = 0, pLen = paramSplit.length; pLen > p; p++ )
            {
              var eachPair = paramSplit[ p ];
              // alert("eachPair: " + eachPair)
              var pairSplit = eachPair.split(":");
              var newAttr = pairSplit[0];

              var newVal = GetValue( pairSplit[1], params );

              var attrns = null;
              if ( "href" == newAttr || "xlink:href" == newAttr )
              {
                attrns = xlinkns;
              }
              el.setAttributeNS( attrns, newAttr, newVal);
            }
          }
        }
        else
        {
          var newVal = GetValue( attrVal, params );
        
          if ( null != newVal && "" != newVal )
          {
            if ( "content-value" == attr.localName )
            {
              el.replaceChild( document.createTextNode( newVal ), el.firstChild );
            }
            else
            {
              el.setAttributeNS( attr.namespaceURI, attr.name, newVal);
              //alert("attr.name: " + attr.name + "\nattrVal: " + newVal)

              // note replacement values in params metadata attribute 
              var paramAttrVal = el.getAttribute( "params" );
              if ( paramAttrVal )
              {
                el.setAttribute( "params", paramAttrVal + ";" + attr.name + ":" + attrVal);
                //alert(paramAttrVal)
              }
              else
              {
                el.setAttribute( "params", attr.name + ":" + attrVal);
              }
            }
          }
        }
      }
    }
  }
}


// au37k
//emulate modifying shadow tree by duplicating element are replacing over use element
function EmulateShadowTree( el, params, uids, idnum )
{
  //alert("EmulateShadowTree")
  shadowParams = params;
  var hasParam = false;
  var cn = el.childNodes;
  for ( var c = 0, cLen = cn.length; cLen > c; c++ )
  {
    var eachChild = cn[ c ];
    //alert(eachChild + ": " + eachChild.nodeType)
    if ( 1 == eachChild.nodeType && "param" == eachChild.localName)
    {
      var name = eachChild.getAttribute( "name" );
      var val = eachChild.getAttribute( "value" );
      shadowParams[ name ] = val;
      hasParam = true; 
      // alert("name: " + name + "\nvalue: " + val)
    }
  }

  var parametersAttrVal = el.getAttribute( "parameters" );
  if( parametersAttrVal )
  {
    // alert(parametersAttrVal)
    var paramSplit = parametersAttrVal.split(";");
    for ( var p = 0, pLen = paramSplit.length; pLen > p; p++ )
    {
      var eachPair = paramSplit[ p ];
      //alert("eachPair: " + eachPair)
      var pairSplit = eachPair.split(":");
      shadowParams[ pairSplit[0] ] = pairSplit[1];
      hasParam = true;
    }     
  }

  if ( hasParam )
  {
    //alert("hasParam")
    var idref = el.getAttributeNS( xlinkns, "href").replace("#", "");
    var refEl = document.getElementById( idref );

    //emulate modifying shadow tree by duplicating element are replacing over use element
    var newEl = refEl.cloneNode(true);

    // alert("EmulateShadowTree:\n\nnewEl:" + newEl + "\nshadowParams: " + shadowParams )
    SetParamValues( newEl, shadowParams, true );

    var wrapper = document.createElementNS( svgns, "g");
    var shadow = document.createElementNS( svgns, "g");
    for ( var ua = 0, uaLen = el.attributes.length; uaLen > ua; ua++ )
    {
      var attr = el.attributes[ ua ];
      if ( "content-value" != attr.localName && "params" != attr.localName && "parameters" != attr.localName 
            && "href" != attr.localName && "x" != attr.localName && "y" != attr.localName )
      {
        //copy use element attributes to replacement image
        shadow.setAttribute( attr.name, attr.value);
      }
    }

    var x = el.getAttribute("x");
    var y = el.getAttribute("y");
    wrapper.setAttribute( "transform", "translate(" + x + "," + y + ")");

    shadow.appendChild(newEl);
    wrapper.appendChild(shadow);


    var shadowEls = newEl.getElementsByTagName( "*" );
    for ( var e = 0, eLen = shadowEls.length; eLen > e; e++ )
    {
      var eachEl = shadowEls[ e ];
      SetParamValues( eachEl, shadowParams, true );

      for ( var a = 0, aLen = eachEl.attributes.length; aLen > a; a++ )
      {
        var attr = eachEl.attributes[ a ];
        var attrVal = attr.value;
        //alert("attr: " + attr.localName + "\nvalue: " + attrVal)
        if ( "id" == attr.localName )
        {
          //change id to unique id
          eachEl.setAttribute( attr.name, attrVal + "__" + idnum);
          uids[attrVal] = attrVal + "__" + idnum;
        }

        //alert( attrVal )
        if ( -1 != attrVal.indexOf("url(#") )
        {
          //alert( attrVal )
          for ( uid in uids )
          {
            //alert( uid + ": " + uids[uid] )
            if ( -1 != attrVal.indexOf( "url(#" + uid + ")" ) )
            {
              eachEl.setAttributeNS( attr.namespaceURI, attr.name, "url(#" + uids[uid] + ")" );
            }
          }
        }
      }
    }
    
    return wrapper;
  }
  return null;
}

