document.addEventListener('DOMContentLoaded', function()
{
	getPageContentFromPlugin(function(content)
	{
		replacePageContent(content);
	});
});

function getPageContentFromPlugin(onResponseCallback)
{
	chrome.extension.sendRequest({ name: 'getBlockedPageContent' }, function(response)
	{
		if (response && response.content)
		{
			onResponseCallback(response.content);
		}
		else
		{
			console.error('Invalid response: "' + JSON.stringify(response) + '"');
		}
	});
}

function evaluateScripts() 
{
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++)
    {
        eval(scripts[i].innerHTML);
    }
}

function replacePageContent(content)
{
    document.open();
    document.write(content);
    evaluateScripts();
    document.close();
}
