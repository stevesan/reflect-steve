//----------------------------------------
//  Put this on level-carrots in the level select screen
//----------------------------------------

#pragma strict

var unbeatIcon : GameObject;
var beatIcon : GameObject;
var levelId = -1;

function Start ()
{
}

function Update ()
{

}

function OnIsBeatenChanged( isBeaten:boolean )
{
    beatIcon.SetActive( isBeaten );
    unbeatIcon.SetActive( !isBeaten );
}

function OnNotBeatError()
{
    unbeatIcon.GetComponent(PositionAnimation).Play();
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
    //transform.localScale = Vector3(1.1, 1.1, 1.1);
    //GetComponent(AlphaHierarchy).SetLocalAlpha(0.5, true);
}

function OnMouseExit()
{
    //transform.localScale = Vector3(1,1,1);
    //GetComponent(AlphaHierarchy).SetLocalAlpha(1.0, true);
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

    function GetBounds() : Bounds { return icon.GetShownIcon().GetComponent(Renderer).bounds; }

    function OnMouseEnter() : void
    {
        if( icon != null )
            icon.OnMouseEnter();
    }

    function OnMouseExit() : void
    {
        if( icon != null )
            icon.OnMouseExit();
    }
};

