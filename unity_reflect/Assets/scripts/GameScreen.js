//----------------------------------------
//  An object (and its children) that is only shown if the gamecontroller's state is a certain value.
//  Otherwise, it fades itself out.
//----------------------------------------
#pragma strict

@script RequireComponent(AlphaHierarchy)

var fadeInAnim = new ParameterAnimation();
var fadeOutAnim = new ParameterAnimation();

// If the game controller's state equals this, the sub-tree will be shown.
var showingGameState = "startscreen";

private var game:GameController;
private var state = "hidden";

function Awake()
{
    game = GameObject.Find("gameController").GetComponent(GameController);
}

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
    state = "fadeout";
    fadeOutAnim.Play();
    BroadcastMessage("OnGameScreenHide", SendMessageOptions.DontRequireReceiver);
}

function Show()
{
	state = "fadein";
	fadeInAnim.Play();

	for( var child:Transform in transform )
	{
		child.gameObject.SetActive(true);
	}

	GetComponent(AlphaHierarchy).SetLocalAlpha(0.0, true);
	BroadcastMessage("OnGameScreenShow", SendMessageOptions.DontRequireReceiver);
}

function Update ()
{
    if( state == "shown" )
    {
        if( game.GetState() != showingGameState )
        {
			Hide();
        }
    }
    else if( state == "hidden" )
    {
        if( game.GetState() == showingGameState )
        {
			Show();
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
			Hide();
        }
        else if( fadeInAnim.GetFraction() >= 1.0 )
		{
			state = "shown";
            BroadcastMessage("OnGameScreenShown", SendMessageOptions.DontRequireReceiver);
		}
    }
}
