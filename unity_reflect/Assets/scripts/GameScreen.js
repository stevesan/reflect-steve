//----------------------------------------
//  An object (and its children) that is only shown if the gamecontroller's state is a certain value.
//  Otherwise, it fades itself out.
//----------------------------------------
#pragma strict

var game:GameController;
var fadeInAnim = new ParameterAnimation();
var fadeOutAnim = new ParameterAnimation();

// If the game controller's state equals this, the sub-tree will be shown.
var showingGameState = "startscreen";
var recurseDepth = 1;

private var state = "hidden";

function SetAlphaRecursive(go:GameObject, alpha:float, depthLeft:int)
{
    var sprite = go.GetComponent( tk2dSprite );
    if( sprite != null )
        sprite.color.a = alpha;

    if( go.guiText != null )
        go.guiText.material.color.a = alpha;

    if( depthLeft > 0 )
    {
        for( var child:Transform in go.transform )
        {
            SetAlphaRecursive(child.gameObject, alpha, depthLeft-1);
        }
    }
}

function Start ()
{
    SetAlphaRecursive(gameObject, 0.0, recurseDepth);
    state = 'hidden';
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
        }
    }
    else if( state == "fadeout" )
    {
        fadeOutAnim.Update();
        SetAlphaRecursive( gameObject, 1-fadeOutAnim.GetFraction(), recurseDepth );
    }
    else if( state == "fadein" )
    {
        fadeInAnim.Update();
        SetAlphaRecursive( gameObject, fadeInAnim.GetFraction(), recurseDepth );

        if( game.GetState() != showingGameState )
        {
            state = "fadeout";
            fadeOutAnim.Play();
        }
    }
}
