namespace MidnightLizard.Util.RegExpBuilder
{
    let capturingGroupsCount = 0;
    /** Resets index counter for the capturing groups */
    export function resetCapturingGroups()
    {
        capturingGroupsCount = 0;
    }
    /** Returns a new index for the next capturing group */
    export function Next()
    {
        return ++capturingGroupsCount;
    }
    /** Returns index of the last capturing group */
    export function Last()
    {
        return capturingGroupsCount || undefined;
    }

    export const Or = "|", OR = Or;
    export const BeginningOfLine = "^", BOF = BeginningOfLine;
    export const EndOfLine = "$", EOL = EndOfLine;
    export const WhiteSpace = "\\s", WSP = WhiteSpace;
    export const NotWhiteSpace = "\\S", NWSP = NotWhiteSpace;
    export const Word = "\\w", WRD = Word;
    export const NotWord = "\\W", NWRD = NotWord;
    export const AnyCharacter = ".", ACH = AnyCharacter, Whatever = ACH;
    export const Dot = "\\.", DOT = Dot;
    export const Comma = ",", COM = Comma;
    export const Hash = "#", HSH = Hash;
    export const Asterisk = "\\*", AST = Asterisk;
    export const Colon = ":", CLN = Colon;
    export const Minus = "\\-", MNS = Minus;
    export const LeftParenthesis = "\\(", LPR = LeftParenthesis;
    export const RightParenthesis = "\\)", RPR = RightParenthesis;
    export const LeftBrace = "\\{", LBR = LeftBrace;
    export const RightBrace = "\\}", RBR = RightBrace;
    export const LeftBracket = "\\[", LBK = LeftBracket;
    export const RightBracket = "\\]", RBK = RightBracket;
    export const WordBoundary = "\\b", WBN = WordBoundary;
    export const NotWordBoundary = "\\B", NWBN = NotWordBoundary;
    export const Digit = "\\d", DGT = Digit;
    export const NotDigit = "\\D", NDGT = NotDigit;
    export const NewLine = "\\n", NLN = NewLine;
    export const CarriageReturn = "\r", CRT = CarriageReturn;

    /** Returns: ${varName} */
    export function $var(varName: string)
    {
        return `$\{${varName}}`;
    }

    /** Replaces all variables with its values */
    export function applyVars(exp: string, vars: Map<string, string>)
    {
        let result = exp;
        vars.forEach((varValue, varName) => result = result.replace(RegExp(escape($var(varName)), "g"), varValue));
        return result;
    }

    /** Excapes reserved symbols from the input string */
    export const char = escape;
    /** Excapes reserved symbols from the input string */
    export function escape(str: string)
    {
        return str && str.replace ? str.replace(/[\[\](){}?*+\^\$\\\.|\-]/g, "\\$&") : "";
    }

    /** Removes extra white spaces and trims the input string */
    export function shrink(str: string)
    {
        return str && str.replace ? str.replace(/\s(?=(\s+))/g, "").trim() : "";
    }

    /** Returns: _exp1_|_exp2_|...|_expN_ */
    export function or(...arrayOfExpressions: string[])
    {
        return arrayOfExpressions.join("|");
    }

    /** Returns: _exp1__exp2__exp3...expN_ */
    export const join = and, combine = and;
    /** Returns: _exp1__exp2__exp3...expN_ */
    export function and(...arrayOfExpressions: string[])
    {
        return arrayOfExpressions.join("");
    }

    /** Returns: [_charSet_] */
    export const oneOf = fromSet;
    /** Returns: [_charSet_] */
    export function fromSet(...charSet: string[])
    {
        return `[${charSet.join("")}]`;
    }

    /** Returns: [^_charSet_] */
    export function outOfSet(...charSet: string[])
    {
        return `[^${charSet.join("")}]`;
    }

    /** Returns: _exp_** */
    export const anytime = any;
    /** Returns: _exp_** */
    export function any(exp: string)
    {
        return `${exp}*`;
    }

    /** Returns: _exp_+ */
    export const sometime = some;
    /** Returns: _exp_+ */
    export function some(exp: string)
    {
        return `${exp}+`;
    }

    /** Returns: _exp_? */
    export const neverOrOnce = noneOrOne;
    /** Returns: _exp_? */
    export function noneOrOne(exp: string)
    {
        return `${exp}?`;
    }

    /** Returns: _exp_ { _occurs_ } */
    export function exactly(occurs: number, exp: string)
    {
        return `${exp}{${occurs}}`;
    }

    /** Returns: _exp_ __{__ _minOccurs_ __,__ _maxOccurs_ __}__ */
    export function strictly(minOccurs: number, maxOccurs: number, exp: string)
    {
        return `${exp}{${minOccurs},${maxOccurs}}`;
    }

    /** Returns: (_exps_) */
    export function remember(...exps: string[])
    {
        return `(${exps.join("")})`;
    }

    /** Returns: (?:_exps_) */
    export function forget(...exps: string[])
    {
        return `(?:${exps.join("")})`;
    }

    /** Returns: (?=_exps_) */
    export function followedBy(...exps: string[])
    {
        return `(?=${exps.join("")})`;
    }

    /** Returns: (?!_exps_) */
    export function notFollowedBy(...exps: string[])
    {
        return `(?!${exps.join("")})`;
    }

    /** Returns: (?=(_exps_))\index */
    export function succeededBy(index: number, ...exps: string[])
    {
        return `(?=(${exps.join("")}))\\${index}`;
    }

    /** Returns: \b_exps_\b */
    export function wholeWord(...exps: string[])
    {
        return `\\b${exps.join("")}\\b`;
    }

    /** Returns: ^_exps_$ */
    export const completely = wholeString;
    /** Returns: ^_exps_$ */
    export function wholeString(...exps: string[])
    {
        return `^${exps.join("")}$`;
    }

    export function somethingIn(left: string, right: string)
    {
        left = escape(left);
        right = escape(right);
        return `${left}[^${right}]+${right}`;
    }

    /** \\__(__[^\\__)__]+\\__)__ */
    export const SomethingInParentheses = somethingIn("(", ")");

    /** \\__{__[^\\__}__]+\\__}__ */
    export const SomethingInBraces = somethingIn("{", "}");

    /** \\__[__[^\\__]__]+\\__]__ */
    export const SomethingInBrackets = somethingIn("[", "]");

    /** __<__[^__>__]+__>__ */
    export const SomethingInChevrons = somethingIn("<", ">");

    /** [\\w\\-] */
    export const Literal = fromSet(Word, Minus);
}