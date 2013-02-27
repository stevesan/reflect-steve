//----------------------------------------
//  Put this on level-carrots in the level select screen
//----------------------------------------

#pragma strict

var unbeatIcon : GameObject;
var beatIcon : GameObject;

var groupNumber = 0;

function Start ()
{
    GetComponent(AlphaHierarchy).SetLocalAlpha(1.0, true);
}

function Update ()
{

}

function OnIsBeatenChanged( isBeaten:boolean )
{
    beatIcon.SetActive( isBeaten );
    unbeatIcon.SetActive( !isBeaten );
}

function GetShownIcon() : GameObject
{
    if( unbeatIcon.activeInHierarchy )
        return unbeatIcon;
    else
        return beatIcon;
}

function OnMouseEnter()
{
    transform.localScale = Vector3(1.1, 1.1, 1.1);
    GetComponent(AlphaHierarchy).SetLocalAlpha(0.5, true);
}

function OnMouseExit()
{
    transform.localScale = Vector3(1,1,1);
    GetComponent(AlphaHierarchy).SetLocalAlpha(1.0, true);
}

//----------------------------------------
//  Adaptor for level icons 
//----------------------------------------
class IconMouseListener implements MouseEventManager.Listener
{
    var icon : LevelIcon;

    function IconMouseListener(_icon:LevelIcon)
    {
        icon = _icon;
    }

    function GetRenderer() : Renderer { return icon.GetShownIcon().GetComponent(Renderer); }
    function OnMouseEnter() : void { icon.OnMouseEnter(); }
    function OnMouseExit() : void { icon.OnMouseExit(); }
};

