#pragma strict

function Awake()
{
	this.GetComponent(Renderer).enabled = false;
}

function OnEnterReflectMode(game:GameController)
{
	this.GetComponent(Renderer).enabled = true;
	this.GetComponent(FadeAnim).SetFade(0.0);
	this.GetComponent(FadeAnim).FadeIn();
}

function OnExitReflectMode(game:GameController)
{
	this.GetComponent(FadeAnim).FadeOut();
}