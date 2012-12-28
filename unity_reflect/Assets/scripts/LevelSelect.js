#pragma strict

var game:GameController;
var fadeOutSecs = 0.5;

private var state = "shown";
private var fadeOutStart = 0.0;

function Start () {

}

function Update () {
    if( state == "shown" )
    {
        if( game.GetState() != "startscreen" )
        {
            state = "fadeout";
            fadeOutStart = Time.time;
        }
    }
    else if( state == "fadeout" )
    {
        var prog = (Time.time-fadeOutStart) / fadeOutSecs;

        if( prog > 1.0 )
        {
            state = "hidden";
            Utils.HideAll(gameObject);
        }
        else
        {
            for( var child in transform )
            {
                var go = (child as Transform).gameObject;
                go.GetComponent(Tk2dAnimSpriteFade).SetFadeAmount(1-prog);
            }
        }
    }
}
