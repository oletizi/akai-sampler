// Generated from ./Sfz.g4 by ANTLR 4.13.1
// jshint ignore: start
import antlr4 from 'antlr4';


const serializedATN = [4,0,9,71,6,-1,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,
7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,1,0,1,0,1,1,1,1,1,2,1,2,1,3,4,3,27,8,
3,11,3,12,3,28,1,4,1,4,1,4,3,4,34,8,4,1,5,1,5,1,6,1,6,1,6,1,6,5,6,42,8,6,
10,6,12,6,45,9,6,1,6,1,6,1,6,1,6,1,6,1,7,1,7,1,7,1,7,5,7,56,8,7,10,7,12,
7,59,9,7,1,7,1,7,1,8,1,8,5,8,65,8,8,10,8,12,8,68,9,8,1,8,1,8,1,43,0,9,1,
1,3,2,5,3,7,4,9,5,11,6,13,7,15,8,17,9,1,0,3,4,0,9,10,13,13,32,32,60,62,2,
0,10,10,13,13,2,0,9,9,32,32,75,0,1,1,0,0,0,0,3,1,0,0,0,0,5,1,0,0,0,0,7,1,
0,0,0,0,9,1,0,0,0,0,11,1,0,0,0,0,13,1,0,0,0,0,15,1,0,0,0,0,17,1,0,0,0,1,
19,1,0,0,0,3,21,1,0,0,0,5,23,1,0,0,0,7,26,1,0,0,0,9,33,1,0,0,0,11,35,1,0,
0,0,13,37,1,0,0,0,15,51,1,0,0,0,17,62,1,0,0,0,19,20,5,60,0,0,20,2,1,0,0,
0,21,22,5,62,0,0,22,4,1,0,0,0,23,24,5,61,0,0,24,6,1,0,0,0,25,27,8,0,0,0,
26,25,1,0,0,0,27,28,1,0,0,0,28,26,1,0,0,0,28,29,1,0,0,0,29,8,1,0,0,0,30,
31,5,13,0,0,31,34,5,10,0,0,32,34,7,1,0,0,33,30,1,0,0,0,33,32,1,0,0,0,34,
10,1,0,0,0,35,36,7,2,0,0,36,12,1,0,0,0,37,38,5,47,0,0,38,39,5,42,0,0,39,
43,1,0,0,0,40,42,9,0,0,0,41,40,1,0,0,0,42,45,1,0,0,0,43,44,1,0,0,0,43,41,
1,0,0,0,44,46,1,0,0,0,45,43,1,0,0,0,46,47,5,42,0,0,47,48,5,47,0,0,48,49,
1,0,0,0,49,50,6,6,0,0,50,14,1,0,0,0,51,52,5,47,0,0,52,53,5,47,0,0,53,57,
1,0,0,0,54,56,8,1,0,0,55,54,1,0,0,0,56,59,1,0,0,0,57,55,1,0,0,0,57,58,1,
0,0,0,58,60,1,0,0,0,59,57,1,0,0,0,60,61,6,7,0,0,61,16,1,0,0,0,62,66,5,35,
0,0,63,65,8,1,0,0,64,63,1,0,0,0,65,68,1,0,0,0,66,64,1,0,0,0,66,67,1,0,0,
0,67,69,1,0,0,0,68,66,1,0,0,0,69,70,6,8,0,0,70,18,1,0,0,0,6,0,28,33,43,57,
66,1,6,0,0];


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

export default class SfzLexer extends antlr4.Lexer {

    static grammarFileName = "Sfz.g4";
    static channelNames = [ "DEFAULT_TOKEN_CHANNEL", "HIDDEN" ];
	static modeNames = [ "DEFAULT_MODE" ];
	static literalNames = [ null, "'<'", "'>'", "'='" ];
	static symbolicNames = [ null, null, null, null, "STRING", "NEWLINE", "WHITESPACE", 
                          "BLOCK_COMMENT", "LINE_COMMENT", "HASH_COMMENT" ];
	static ruleNames = [ "T__0", "T__1", "T__2", "STRING", "NEWLINE", "WHITESPACE", 
                      "BLOCK_COMMENT", "LINE_COMMENT", "HASH_COMMENT" ];

    constructor(input) {
        super(input)
        this._interp = new antlr4.atn.LexerATNSimulator(this, atn, decisionsToDFA, new antlr4.atn.PredictionContextCache());
    }
}

SfzLexer.EOF = antlr4.Token.EOF;
SfzLexer.T__0 = 1;
SfzLexer.T__1 = 2;
SfzLexer.T__2 = 3;
SfzLexer.STRING = 4;
SfzLexer.NEWLINE = 5;
SfzLexer.WHITESPACE = 6;
SfzLexer.BLOCK_COMMENT = 7;
SfzLexer.LINE_COMMENT = 8;
SfzLexer.HASH_COMMENT = 9;



