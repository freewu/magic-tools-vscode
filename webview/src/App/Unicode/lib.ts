// ASCII 转换 Unicode
export const ascii2Unicode = (value: string) :string => {
  if (value.trim() === '') {
    return '';
  }
  const reuslt: string[] = [];
  for (let i = 0; i < value.length; i++) {
    reuslt.push('&#' + value.charCodeAt(i) + ';');
  }
  return reuslt.join('');
}

// Unicode 转换 ASCII
export const unicode2Ascii = (value: string) :string => {
  if (value.trim() === '') {
    return '';
  }
  let arr = value.match(/&#(\d+);/g);
  if(null === arr) return '';
  const reuslt: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    // String.fromCharCode( value[i].replace(/[&#;]/g, '') )
    reuslt.push(String.fromCharCode( parseInt(arr[i].replace(/[&#;]/g, '')) ));
  }
  return reuslt.join('');
}