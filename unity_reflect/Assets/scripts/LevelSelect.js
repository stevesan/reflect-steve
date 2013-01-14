#pragma strict

var game:GameController;

function Start () {
}

function OnGameScreenShow()
{
}

function OnGameScreenHide()
{

}

private var prevTarget:GameObject = null;

function Update ()
{
    var clickPos = game.GetMouseXYWorldPos();

    var currTarget:GameObject = null; 
    var overIndex = -1;

    //----------------------------------------
    // Detect and generate mouse events
    //----------------------------------------
    for( var i = 0; ; i++ )
    {
        var iconName = "icon" + i.ToString("000");
        var iconXform = transform.Find(iconName);

        if( iconXform == null )
            break;

        var iconObj = iconXform.gameObject;
        var iconRender = iconObj.GetComponent(Renderer);

        if( iconRender == null )
            continue;

        var testPt = Vector3( clickPos.x, clickPos.y, iconRender.bounds.center.z );
        if( iconRender.bounds.Contains(testPt) )
        {
            currTarget = iconObj;
            overIndex = i;
            break;
        }
    }

    if( currTarget != prevTarget )
    {
        if( currTarget != null )
        {
            currTarget.SendMessage("OnMouseEnter", SendMessageOptions.DontRequireReceiver);
        }

        if( prevTarget != null )
        {
            prevTarget.SendMessage("OnMouseExit", SendMessageOptions.DontRequireReceiver);
        }

        prevTarget = currTarget;
    }

    //----------------------------------------
    //  See if we clicked a level
    //----------------------------------------
    if( Input.GetButtonDown('ReflectToggle') )
    {
        game.OnLevelSelected(overIndex);
    }
}
