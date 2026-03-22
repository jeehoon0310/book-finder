// QWERTY ↔ 두벌식 키보드 매핑
const ENG_KEYS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KOR_KEYS = 'ㅁㅠㅊㅇㄷㄹㅎㅗㅑㅓㅏㅣㅡㅜㅐㅔㅂㄱㄴㅅㅕㅍㅈㅌㅛㅋㅁㅠㅊㅇㄸㄹㅎㅗㅑㅓㅏㅣㅡㅜㅒㅖㅃㄲㄴㅆㅕㅍㅉㅌㅛㅋ';

const engToKorMap = new Map<string, string>();
const korToEngMap = new Map<string, string>();

for (let i = 0; i < ENG_KEYS.length; i++) {
  engToKorMap.set(ENG_KEYS[i], KOR_KEYS[i]);
  korToEngMap.set(KOR_KEYS[i], ENG_KEYS[i]);
}

/**
 * 영문 QWERTY 입력을 한글로 변환
 * "skfnxm" → "나루토"
 */
export function engToKor(input: string): string {
  const jamo = input.split('').map(ch => engToKorMap.get(ch) ?? ch).join('');
  return compose(jamo);
}

/**
 * 한글 자모를 영문 QWERTY로 변환
 * 완성형 한글을 자모로 분해한 뒤 변환
 * "ㅎㅅㅐ" → "GTO" (대문자는 Shift 조합)
 */
export function korToEng(input: string): string {
  const decomposed = decompose(input);
  return decomposed.split('').map(ch => korToEngMap.get(ch) ?? ch).join('');
}

/** 입력이 전부 영문(+숫자/공백)인지 */
export function isAllEnglish(input: string): boolean {
  return /^[a-zA-Z0-9\s]+$/.test(input);
}

/** 입력에 한글이 포함되어 있는지 */
export function hasKorean(input: string): boolean {
  return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(input);
}

// 한글 유니코드 분해
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

// 복합 자모 분해
const COMPLEX_JONG: Record<string, string> = {
  'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ',
  'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ',
  'ㅄ': 'ㅂㅅ',
};
const COMPLEX_JUNG: Record<string, string> = {
  'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ',
  'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ',
};

// 자모 → 완성형 한글 조합
const CHO_SET = new Set(CHO);
const JUNG_SET = new Set(JUNG);
const JONG_MAP = new Map(JONG.map((j, i) => [j, i]));

// 복합 중성 조합
const COMBINE_JUNG: Record<string, Record<string, string>> = {
  'ㅗ': { 'ㅏ': 'ㅘ', 'ㅐ': 'ㅙ', 'ㅣ': 'ㅚ' },
  'ㅜ': { 'ㅓ': 'ㅝ', 'ㅔ': 'ㅞ', 'ㅣ': 'ㅟ' },
  'ㅡ': { 'ㅣ': 'ㅢ' },
};

// 복합 종성 조합
const COMBINE_JONG: Record<string, Record<string, string>> = {
  'ㄱ': { 'ㅅ': 'ㄳ' },
  'ㄴ': { 'ㅈ': 'ㄵ', 'ㅎ': 'ㄶ' },
  'ㄹ': { 'ㄱ': 'ㄺ', 'ㅁ': 'ㄻ', 'ㅂ': 'ㄼ', 'ㅅ': 'ㄽ', 'ㅌ': 'ㄾ', 'ㅍ': 'ㄿ', 'ㅎ': 'ㅀ' },
  'ㅂ': { 'ㅅ': 'ㅄ' },
};

/** 자모열을 완성형 한글로 조합: "ㄴㅏㄹㅜㅌㅡ" → "나루토" */
function compose(jamo: string): string {
  const chars = [...jamo];
  let result = '';
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];
    const choIdx = CHO.indexOf(ch);

    // 초성이 아니면 그대로
    if (choIdx === -1 || !CHO_SET.has(ch)) {
      result += ch;
      i++;
      continue;
    }

    // 다음이 중성인지 확인
    if (i + 1 >= chars.length || !JUNG_SET.has(chars[i + 1])) {
      result += ch;
      i++;
      continue;
    }

    let jung = chars[i + 1];
    let jungIdx = JUNG.indexOf(jung);
    i += 2;

    // 복합 중성 체크
    if (i < chars.length && COMBINE_JUNG[jung]?.[chars[i]]) {
      jung = COMBINE_JUNG[jung][chars[i]];
      jungIdx = JUNG.indexOf(jung);
      i++;
    }

    // 종성 체크
    let jongIdx = 0;
    if (i < chars.length) {
      const possibleJong = chars[i];
      const possibleJongIdx = JONG_MAP.get(possibleJong);

      if (possibleJongIdx !== undefined && possibleJongIdx > 0) {
        // 다음 글자가 중성이면 이 자모는 종성이 아닌 다음 글자의 초성
        if (i + 1 < chars.length && JUNG_SET.has(chars[i + 1])) {
          // 종성 없이 완성
        } else {
          // 복합 종성 체크
          if (i + 1 < chars.length && COMBINE_JONG[possibleJong]?.[chars[i + 1]]) {
            const combinedJong = COMBINE_JONG[possibleJong][chars[i + 1]];
            const combinedIdx = JONG_MAP.get(combinedJong);
            // 복합 종성 다음이 중성이면 뒤 자모를 떼어냄
            if (i + 2 < chars.length && JUNG_SET.has(chars[i + 2])) {
              jongIdx = possibleJongIdx;
              i++;
            } else if (combinedIdx !== undefined) {
              jongIdx = combinedIdx;
              i += 2;
            } else {
              jongIdx = possibleJongIdx;
              i++;
            }
          } else {
            jongIdx = possibleJongIdx;
            i++;
          }
        }
      }
    }

    result += String.fromCharCode(0xAC00 + choIdx * 588 + jungIdx * 28 + jongIdx);
  }

  return result;
}

/** 완성형 한글을 자모로 분해 */
function decompose(input: string): string {
  let result = '';
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const offset = code - 0xAC00;
      const cho = CHO[Math.floor(offset / 588)];
      const jung = JUNG[Math.floor((offset % 588) / 28)];
      const jong = JONG[offset % 28];

      result += cho;
      result += COMPLEX_JUNG[jung] ?? jung;
      if (jong) result += COMPLEX_JONG[jong] ?? jong;
    } else {
      result += ch;
    }
  }
  return result;
}
