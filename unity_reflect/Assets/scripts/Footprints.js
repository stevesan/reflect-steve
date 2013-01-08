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

private var numTriggered = 0;

function Awake()
{
    anim.Awake();
}

function Start ()
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

            // TODO - do left/right foot, rotation, etc.
            var go = Instantiate(curveGen.stepPrefab, p, rot);
            go.transform.parent = transform;
        }
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
    for( var child:Transform in transform )
    {
        if( isBroadcast )
            child.gameObject.BroadcastMessage( stopMessage );
        else
            child.gameObject.SendMessage( stopMessage );
    }
}

function Update () {

    anim.Update();

    var frac = anim.GetFraction();

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
