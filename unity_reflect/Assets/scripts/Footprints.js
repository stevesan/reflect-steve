//----------------------------------------
//   This was made for "footprint" animations, but can probably be useful for other stuff
//  The children of the object will be treated as step locations, and will be destroyed!
//----------------------------------------
#pragma strict

import System.Collections.Generic;

var anim = new ParameterAnimation();

// The message to send to the objects when they should trigger themselves
var triggerMessage = "Play";

// The message to send to the objects when they should stop themselves
var stopMessage = "Stop";

// If true, the messages will be broadcasted to the objects' children as well as themselves.
var isBroadcast = false;

// The prefab of the animation that will be played each "step"
var stepAnimPrefab:GameObject = null;

private var numTriggered = 0;

private var animInsts = new List.<GameObject>();

function Awake()
{
    anim.Awake();
}

function Start ()
{
    for( var xform:Transform in transform )
    {
        var inst = Instantiate( stepAnimPrefab, xform.position, xform.rotation );
        animInsts.Add(inst);
        Destroy(xform.gameObject);
    }
}

function Play()
{
    numTriggered = 0;
    anim.Play();
}

function Stop()
{
    anim.Stop();

    // Stop all children too
    for( anim in animInsts )
    {
        if( isBroadcast )
            anim.BroadcastMessage( stopMessage );
        else
            anim.SendMessage( stopMessage );
    }
}

function Update () {

    anim.Update();

    var frac = anim.GetFraction();

    var nextTriggerFrac = 1.0*numTriggered/animInsts.Count;

    while( numTriggered < animInsts.Count && nextTriggerFrac < frac )
    {
        var next = numTriggered;

        if( isBroadcast )
            animInsts[next].BroadcastMessage( triggerMessage );
        else
            animInsts[next].SendMessage( triggerMessage );

        numTriggered++;
        nextTriggerFrac = 1.0*numTriggered/animInsts.Count;
    }

}
