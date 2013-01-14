//----------------------------------------
//  Put this on level-carrots in the level select screen
//----------------------------------------

#pragma strict

function Start () {

}

function Update () {

}

function OnMouseEnter()
{
    SendMessage("Play");
}

function OnMouseExit()
{
    SendMessage("Stop");
}
