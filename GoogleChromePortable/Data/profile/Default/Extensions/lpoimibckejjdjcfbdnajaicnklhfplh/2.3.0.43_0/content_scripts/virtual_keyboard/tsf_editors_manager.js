var KasperskyLabVirtualKeyboard = (function (namespace)
{

namespace.TsfEditorsManager = function()
{
	var m_editors = {};
	var m_dummyEditor = new DummyEditor();

	this.insert = function(editorId, editor)
	{
		m_editors[editorId] = editor;
	}

	this.destroy = function(editorId)
	{
		if (editorId in m_editors)
		{
			m_editors[editorId].destroy();
			delete m_editors[editorId];
		}
	}

	this.insertText = function(editorId, text)
	{
		getEditor(editorId).insertText(text);
	}

	this.setComposition = function(editorId, composition)
	{
		getEditor(editorId).setComposition(composition);
	}

	function getEditor(editorId)
	{
		return editorId in m_editors ? m_editors[editorId] : m_dummyEditor;
	}

	function DummyEditor()
	{
		this.destroy = function() {}
		this.insertText = function() {}
		this.setComposition = function() {}
	}
}

return namespace;
}(KasperskyLabVirtualKeyboard || {}));
