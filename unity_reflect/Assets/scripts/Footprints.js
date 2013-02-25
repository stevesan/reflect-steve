//----------------------------------------
// This was made for "footprint" animations, but can probably be useful for other stuff
//----------------------------------------
#pragma strict

import System.Collections.Generic;

var playback = new ParameterAnimation();

// The message to send to the objects when they should trigger themselves
var triggerMessage = "Play";

// The message to send to the objects when they should stop themselves
var stopMessage = "Stop";

// The message to send to the objects when they should skip to the end of their "step" animation
var endMessage = "SkipToEnd";

// If true, the messages will be broadcasted to the objects' children as well as themselves.
var isBroadcast = false;

//----------------------------------------
//   This can also auto-gen foot step positions using a subdivsion curve
//----------------------------------------
class CurveGenInfo
{
    var enabled = false;
    var numSteps = 10;
    var curve:SubdivisionCurve = null;
    var stepPrefab:GameObject = null;
    var halfWidth = 0.1;
};
var curveGen = new CurveGenInfo();

//----------------------------------------
//  
//----------------------------------------
private var numTriggered = 0;
private var state = "uninit";

function Awake()
{
    playback.Awake();    
    state = "uninit";
}

private function CreateStepsIdem()
{
    if( state == "uninit" )
    {
        if( curveGen.enabled && curveGen.numSteps > 0 )
        {
            for( var i = 0; i < curveGen.numSteps; i++ )
            {
                var t = i * 1.0/(curveGen.numSteps-1);
                var tstep = (i+0.5) * 1.0/(curveGen.numSteps-1);
                var p = curveGen.curve.GetSmoothedPoint(t);
                var pstep = curveGen.curve.GetSmoothedPoint(tstep);

                var stepDir = (pstep-p).normalized;
                var sideDir = Math2D.PerpCCW(stepDir);

                // point in right direction
                var rot:Quaternion;
                rot.SetLookRotation( Vector3(0,0,1), sideDir );

                // left, right
                var sideSign = i%2 == 0 ? -1 : 1;
                p += sideDir * sideSign * curveGen.halfWidth;

                var go = Instantiate(curveGen.stepPrefab, p, rot);
                go.name = this.gameObject.name + "_print"+i;
                go.transform.parent = transform;
            }
        }

        state = "ready";
    }
}

function Start()
{
    CreateStepsIdem();
}

function Play()
{
    CreateStepsIdem();

    numTriggered = 0;
    playback.Play();
}

function Stop()
{
    CreateStepsIdem();

    playback.Stop();

    // Stop all children too
    for( var child:Transform in transform )
    {
        if( isBroadcast )
            child.gameObject.BroadcastMessage( stopMessage );
        else
            child.gameObject.SendMessage( stopMessage );
    }
}

function SkipToEnd()
{
    CreateStepsIdem();

    playback.SetLinearFraction(1.0);

    // trigger all to skip to end
    numTriggered = 0;
    while( numTriggered < transform.childCount )
    {
        var go = transform.GetChild(numTriggered);
        if( isBroadcast )
            go.BroadcastMessage( endMessage, SendMessageOptions.DontRequireReceiver );
        else
            go.SendMessage( endMessage, SendMessageOptions.DontRequireReceiver );
        numTriggered++;
    }
}

function Update ()
{
    playback.Update();

    var frac = playback.GetFraction();

    // Time to trigger the next one yet?
    var nextTriggerFrac = 1.0*numTriggered/transform.childCount;

    while( numTriggered < transform.childCount && nextTriggerFrac < frac )
    {
        var next = numTriggered;
        var go = transform.GetChild(next);

        if( isBroadcast )
            go.BroadcastMessage( triggerMessage );
        else
            go.SendMessage( triggerMessage );

        numTriggered++;
        nextTriggerFrac = 1.0*numTriggered/transform.childCount;
    }

}
