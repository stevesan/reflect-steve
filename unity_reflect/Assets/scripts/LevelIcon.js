//----------------------------------------
//  Put this on level-carrots in the level select screen
//----------------------------------------

#pragma strict

var groupNumber = 0;

function Start () {

}

function Update () {

}

function OnMouseEnter()
{
    //GetComponent(Tk2dAnimSpriteFade).playback.SetLinearFraction(0.5);
    SendMessage("Unpause");
}

function OnMouseExit()
{
    SendMessage("Stop");
}
