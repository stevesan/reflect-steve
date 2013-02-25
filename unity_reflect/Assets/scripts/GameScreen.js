//----------------------------------------
//  An object (and its children) that is only shown if the gamecontroller's state is a certain value.
//  Otherwise, it fades itself out.
//----------------------------------------
#pragma strict

@script RequireComponent(AlphaHierarchy)

var game:GameController;
var fadeInAnim = new ParameterAnimation();
var fadeOutAnim = new ParameterAnimation();

// If the game controller's state equals this, the sub-tree will be shown.
var showingGameState = "startscreen";

private var state = "hidden";

function Start ()
{
    GetComponent(AlphaHierarchy).SetLocalAlpha(0.0, true);
    state = 'hidden';

    for( var child:Transform in transform )
    {
        child.gameObject.SetActive(false);
    }
}

function Hide()
{
    BroadcastMessage("OnGameScreenHide", SendMessageOptions.DontRequireReceiver);
    state = "fadeout";
    fadeOutAnim.Play();
}

function Update ()
{
    if( state == "shown" )
    {
        if( game.GetState() != showingGameState )
        {
            BroadcastMessage("OnGameScreenHide", SendMessageOptions.DontRequireReceiver);
            state = "fadeout";
            fadeOutAnim.Play();
        }
    }
    else if( state == "hidden" )
    {
        if( game.GetState() == showingGameState )
        {
            state = "fadein";
            fadeInAnim.Play();

            for( var child:Transform in transform )
            {
                child.gameObject.SetActive(true);
            }

            BroadcastMessage("OnGameScreenShow", SendMessageOptions.DontRequireReceiver);
            GetComponent(AlphaHierarchy).SetLocalAlpha(0.0, true);
        }
    }
    else if( state == "fadeout" )
    {
        fadeOutAnim.Update();
        GetComponent(AlphaHierarchy).SetLocalAlpha( 1.0 - fadeOutAnim.GetFraction(), true );

        if( fadeOutAnim.GetFraction() >= 1.0 )
        {
            state = "hidden";

            for( var child:Transform in transform )
            {
                child.gameObject.SetActive(false);
            }

            BroadcastMessage("OnGameScreenHidden", SendMessageOptions.DontRequireReceiver);
        }
    }
    else if( state == "fadein" )
    {
        fadeInAnim.Update();
        GetComponent(AlphaHierarchy).SetLocalAlpha( fadeInAnim.GetFraction(), true );

        if( game.GetState() != showingGameState )
        {
            state = "fadeout";
            BroadcastMessage("OnGameScreenHide", SendMessageOptions.DontRequireReceiver);
            fadeOutAnim.Play();
        }
    }
}
