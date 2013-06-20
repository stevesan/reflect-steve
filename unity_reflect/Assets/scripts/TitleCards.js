#pragma strict

public static var main:TitleCards;

private var group2text = [
"I was lost, but had to keep moving.",
"I was alone, with only myself to rely on.",
"I was not prepared, but who really is?",
"I could rest, but not for too long.",
"I had no idea where I was headed.",
"I had a feeling that this was it...",
"But will I ever know for sure?"
];

function Awake()
{
    main = this;
}

function Start()
{
    Hide();
}

function Update()
{

}

function Hide()
{
	GetComponent(GUIText).enabled = false;
}

function Show()
{
	GetComponent(GUIText).enabled = true;

	var group = LevelSelect.main.GetCurrentGroup();
	if( group < group2text.length )
		GetComponent(GUIText).text = group2text[group] + "\n\n(click)";
}
