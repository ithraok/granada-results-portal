// Presentation only: preserve period 1; never count placeholder zeros as period 2 results.
export function periodView(data, period = '1') {
  if (!['1', '2', 'final'].includes(period)) throw new Error('INVALID_PERIOD');
  const demoSecond = data.demo === true ? data.periods?.['2'] : null;
  const ready = demoSecond && [2,3].every((i)=>[data.scores[i]?.[1],demoSecond.scores[i]?.[1]].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=(i===2?40:60)));
  const tasks = ready ? (data.scores[2][1]+demoSecond.scores[2][1])/2 : null;
  const assessments = ready ? (data.scores[3][1]+demoSecond.scores[3][1])/2 : null;
  if (period === 'final') return {
    period, title: '📊 التقدير التقريبي للفصل الدراسي الأول',
    status: 'احتساب تقديري غير رسمي — النتيجة الرسمية هي المعتمدة في نظام نور',
    showNotes: false, showCalculation: true,
    scores: [
      ['المتوسط التقديري للمهام الأدائية للفترتين من 40', ready?tasks:'بانتظار اكتمال الفترتين', 'green', '🌟'],
      ['المتوسط التقديري للاختبارات والتطبيقات والمشروعات العملية للفترتين من 60', ready?assessments:'بانتظار اكتمال الفترتين', 'blue', '📘'],
      ['المجموع التقديري التقريبي للفصل من 100', ready?tasks+assessments:'بانتظار اكتمال الفترتين', '', '']
    ]
  };
  const second = period === '2';
  return {
    period, title: '📊 تفاصيل الأداء والدرجات — الفترة ' + (second ? 'الثانية' : 'الأولى'),
    status: second ? (demoSecond?'الفترة الثانية — درجات وهمية للشرح والتجربة':'لم يبدأ الرصد — الأصفار للعرض، وليست درجات نهائية مرصودة') : 'درجات الفترة الأولى',
    showNotes: true, showCalculation: false,
    scores: (second&&demoSecond?demoSecond.scores:data.scores).map(([label, value, tone, icon], index) => [
      second ? label.replaceAll('الفترة الأولى', 'الفترة الثانية') : label,
      second&&!demoSecond ? (index === 0 ? 'لم يبدأ الرصد' : index >= 10 ? 'لم تُسجل ملاحظات لهذه الفترة' : 0) : value,
      tone, icon
    ]),
    homework: second ? (demoSecond?.homework||'لم تُسجل واجبات للفترة الثانية بعد.') : data.homework || 'لا توجد واجبات مسجلة حاليًا',
    notes: second ? (demoSecond?.notes||'لم تُسجل توصيات للفترة الثانية بعد.') : data.notes || 'لا توجد ملاحظات'
  };
}
