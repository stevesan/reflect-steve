#pragma strict

private var mouseMgr = new MouseEventManager();
private var mouseListeners = new List.<MouseEventManager.Listener>();
var game:GameController = null;
var flapAnim:tk2dAnimatedSprite = null;
var music:MusicManager;
var profile:Profile;

private var state = "uninit";

private function GetChild(name:String) : GameObject
{
    var t = transform.Find(name);
    return t.gameObject;
}

private function GetItem(name:String) : GUIText
{
    return GetChild(name).GetComponent(GUIText);
}

private class ItemListener extends MouseEventManager.GUITextListener
{
    var origFontSize = 16;

    function ItemListener(text:GUIText)
    {
        super(text);
        origFontSize = text.fontSize;
    }

    function OnMouseEnter() : void
    {
        this.text.fontSize = origFontSize+2;
    }

    function OnMouseExit() : void
    {
        this.text.fontSize = origFontSize;
    }
}

function Start()
{
    mouseMgr.SetTargets(mouseListeners);

    mouseListeners.Add( new ItemListener( GetItem("back") ));
    mouseListeners.Add( new ItemListener( GetItem("credits") ));
    mouseListeners.Add( new ItemListener( GetItem("music") ));
    mouseListeners.Add( new ItemListener( GetItem("reset") ));
    mouseListeners.Add( new ItemListener( GetItem("select") ));
    mouseListeners.Add( new ItemListener( GetItem("skip") ));

    EnterHidden();
}

function EnterActive()
{
    if( state != "active" )
    {
        gameObject.SetActive(true);
        state = "active";
        flapAnim.gameObject.SetActive(true);
        flapAnim.Play();

/*
        if( game.GetIsInLevel() )
        {
            if( !game.HasSeenLevel( game.GetCurrentLevelId()+1 ) )
            {
            }
        }
        */
        GetItem("skip").gameObject.SetActive(false);
    }
}

function GetIsActive()
{
    return state == "active";
}

function EnterHidden()
{
    if( state != "hidden" )
    {
        state = "hidden";

        for( var listener:ItemListener in mouseListeners )
        {
            listener.OnMouseExit();
        }

        gameObject.SetActive(false);
        flapAnim.gameObject.SetActive(false);
    }
}

function Update()
{
    if( state == "active" )
    {
        mouseMgr.Update();

        var targetItem = mouseMgr.GetCurrentTarget() as ItemListener;

        if( Input.GetMouseButtonDown(0) && targetItem )
        {
            if( targetItem.text.gameObject.name == "back" )
            {
                EnterHidden();
            }
            else if( targetItem.text.gameObject.name == "music" )
            {
                music.OnToggleMuteMusic();
            }
            else if( targetItem.text.gameObject.name == "reset" )
            {
                game.ResetLevel();
            }
            else if( targetItem.text.gameObject.name == "select" )
            {
                profile.OnSkipLevel(game.GetCurrentLevelId());
                game.FadeToLevelSelect();
            }
        }
    }
}