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
    GetComponent(AlphaHierarchy).localAlpha = 0.0;
    state = 'hidden';

    for( var child:Transform in transform )
    {
        child.gameObject.SetActive(false);
    }
}

function Update ()
{
    if( state == "shown" )
    {
        if( game.GetState() != showingGameState )
        {
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
            GetComponent(AlphaHierarchy).localAlpha = 0.0;

            for( var child:Transform in transform )
            {
                child.gameObject.SetActive(true);
            }
        }
    }
    else if( state == "fadeout" )
    {
        fadeOutAnim.Update();
        GetComponent(AlphaHierarchy).localAlpha = 1.0 - fadeOutAnim.GetFraction();

        if( fadeOutAnim.GetFraction() >= 1.0 )
        {
            state = "hidden";

            for( var child:Transform in transform )
            {
                child.gameObject.SetActive(false);
            }
        }
    }
    else if( state == "fadein" )
    {
        fadeInAnim.Update();
        GetComponent(AlphaHierarchy).localAlpha = fadeInAnim.GetFraction();

        if( game.GetState() != showingGameState )
        {
            state = "fadeout";
            fadeOutAnim.Play();
        }
    }
}
