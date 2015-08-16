var KasperskyLabManageability = (function (ns)
{
function TryDisableExtension(extensionId) 
{
    try 
    {
        console.log('Disable extension: ' + extensionId);
        chrome.management.setEnabled(extensionId, false, function () { console.log(extensionId + ' disabled'); });
    }
    catch (e) 
    {
        console.error('TryDisableExtension "' + extensionId + '" failed. Exception: ' + e);
    }
}

function TryDisableExtensions(extensionIds) 
{
    for (i in extensionIds) 
    {
        TryDisableExtension(extensionIds[i]);
    }
}

ns.getExtensionVersion = function (args, callback)
{
    callback( [chrome.runtime.getManifest().version] );
}

ns.deactivateExtensions = function (extensionIds, callback) 
{
    TryDisableExtensions(extensionIds);
    callback( [] );
}

ns.startup = function (plugin)
{
	try
	{
	    plugin.registerMethod('mngmt.getExtensionVersion', ns.getExtensionVersion);
	    plugin.registerMethod('mngmt.deactivateExtensions', ns.deactivateExtensions);
	}
	catch(e)
	{
		console.error("manageability.js startup exception: " + e);
	}
}

return ns;
}(KasperskyLabManageability || {}));
