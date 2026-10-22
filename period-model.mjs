// Presentation only: preserve period 1; never count placeholder zeros as period 2 results.
export function periodView(data, period = '1') {
  if (!['1', '2', 'final'].includes(period)) throw new Error('INVALID_PERIOD');
  if (period === 'final') return {
    period, title: '📊 التقدير التقريبي للفصل الدراسي الأول',
    status: 'احتساب تقديري غير رسمي — النتيجة الرسمية هي المعتمدة في نظام نور',
    showNotes: false, showCalculation: true,
    scores: [
      ['المتوسط التقديري للمهام الأدائية للفترتين من 40', 'بانتظار اكتمال الفترتين', 'green', '🌟'],
      ['المتوسط التقديري للاختبارات والتطبيقات والمشروعات العملية للفترتين من 60', 'بانتظار اكتمال الفترتين', 'blue', '📘'],
      ['المجموع التقديري التقريبي للفصل من 100', 'بانتظار اكتمال الفترتين', '', '']
    ]
  };
  const second = period === '2';
  return {
    period, title: '📊 تفاصيل الأداء والدرجات — الفترة ' + (second ? 'الثانية' : 'الأولى'),
    status: second ? 'لم يبدأ الرصد — الأصفار للعرض، وليست درجات نهائية مرصودة' : 'درجات الفترة الأولى',
    showNotes: true, showCalculation: false,
    scores: data.scores.map(([label, value, tone, icon], index) => [
      second ? label.replaceAll('الفترة الأولى', 'الفترة الثانية') : label,
      second ? (index === 0 ? 'لم يبدأ الرصد' : index >= 10 ? 'لم تُسجل ملاحظات لهذه الفترة' : 0) : value,
      tone, icon
    ]),
    homework: second ? 'لم تُسجل واجبات للفترة الثانية بعد.' : data.homework || 'لا توجد واجبات مسجلة حاليًا',
    notes: second ? 'لم تُسجل توصيات للفترة الثانية بعد.' : data.notes || 'لا توجد ملاحظات'
  };
}
