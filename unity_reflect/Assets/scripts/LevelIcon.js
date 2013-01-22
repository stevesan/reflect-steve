//----------------------------------------
//  Put this on level-carrots in the level select screen
//----------------------------------------

#pragma strict

var groupNumber = 0;

function Start ()
{
    GetComponent(AlphaHierarchy).SetLocalAlpha(1.0, true);
}

function Update ()
{

}

function OnMouseEnter()
{
    //GetComponent(Tk2dAnimSpriteFade).playback.SetLinearFraction(0.5);
    //transform.localScale = Vector3(1.1, 1.1, 1.1);
    GetComponent(AlphaHierarchy).SetLocalAlpha(0.5, true);
}

function OnMouseExit()
{
    //transform.localScale = Vector3(1,1,1);
    GetComponent(AlphaHierarchy).SetLocalAlpha(1.0, true);
}
