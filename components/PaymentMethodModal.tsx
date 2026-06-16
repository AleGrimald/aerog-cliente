'use client';

interface PaymentCard {
  tarjeta_id: number;
  titular: string;
  marca: string;
  ultimos4: string;
}

interface PaymentSummary {
  subtotal: number;
  interes: number;
  total: number;
  montoPorCuota: number;
}

type PaymentType = 'debito' | 'credito' | 'mercadopago_qr' | null;

interface NewCardData {
  numero: string;
  titular: string;
  vencimiento: string;
}

interface PaymentMethodModalProps {
  open: boolean;
  title: string;
  cards: PaymentCard[];
  selectedCardId: number | null;
  paymentType: PaymentType;
  installments: number;
  cvv: string;
  cvvError: string;
  summary: PaymentSummary;
  message: string;
  availablePoints?: number;
  pointsToUse?: number;
  qrCheckoutUrl?: string;
  qrImageUrl?: string;
  showVerifyQrButton?: boolean;
  isVerifyingQr?: boolean;
  confirmLabel: string;
  disableConfirm: boolean;
  showAddCardModal: boolean;
  newCard: NewCardData;
  newCardErrors: Record<string, string>;
  onSelectCard: (card: PaymentCard) => void;
  onSelectMercadoPagoQr: () => void;
  onChangeCvv: (value: string) => void;
  onChangeInstallments: (value: number) => void;
  onChangePointsToUse?: (value: number) => void;
  onOpenAddCard: () => void;
  onClose: () => void;
  onConfirm: () => void;
  onVerifyQr?: () => void;
  onOpenCheckout?: () => void;
  onCloseAddCard: () => void;
  onChangeNewCard: (field: 'numero' | 'titular' | 'vencimiento', value: string) => void;
  onSaveNewCard: () => void;
}

export default function PaymentMethodModal({
  open,
  title,
  cards,
  selectedCardId,
  paymentType,
  installments,
  cvv,
  cvvError,
  summary,
  message,
  availablePoints = 0,
  pointsToUse = 0,
  qrCheckoutUrl,
  qrImageUrl,
  showVerifyQrButton = false,
  isVerifyingQr = false,
  confirmLabel,
  disableConfirm,
  showAddCardModal,
  newCard,
  newCardErrors,
  onSelectCard,
  onSelectMercadoPagoQr,
  onChangeCvv,
  onChangeInstallments,
  onChangePointsToUse,
  onOpenAddCard,
  onClose,
  onConfirm,
  onVerifyQr,
  onOpenCheckout,
  onCloseAddCard,
  onChangeNewCard,
  onSaveNewCard,
}: PaymentMethodModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:p-8">
        <h3 className="mb-4 text-xl font-bold text-slate-900">{title}</h3>

        <div className="mb-4">
          <p className="mb-2 font-semibold text-slate-700">Tarjetas guardadas:</p>
          {cards.length === 0 ? (
            <button
              onClick={onOpenAddCard}
              className="w-full rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-center text-slate-600 transition hover:border-blue-500 hover:bg-blue-50"
            >
              + Agregar Tarjeta
            </button>
          ) : (
            <div className="space-y-2">
              {cards.map((card) => (
                <button
                  key={card.tarjeta_id}
                  onClick={() => onSelectCard(card)}
                  className={`w-full rounded-xl border px-4 py-3 text-left hover:border-blue-400 ${selectedCardId === card.tarjeta_id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{card.marca} - {card.titular} ****{card.ultimos4}</span>
                    {selectedCardId === card.tarjeta_id && <span className="font-bold text-blue-600">Seleccionada</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="mb-2 font-semibold text-slate-700">Otras formas de pago:</p>
          <button
            onClick={onSelectMercadoPagoQr}
            className={`w-full rounded-xl border px-4 py-3 text-left hover:border-blue-400 ${paymentType === 'mercadopago_qr' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
          >
            Mercado Pago QR
          </button>
        </div>

        {paymentType && paymentType !== 'mercadopago_qr' && selectedCardId && (
          <div className="mb-4">
            <p className="mb-3 font-semibold text-slate-700">
              Tipo de Pago: <span className="text-blue-600">{paymentType === 'debito' ? 'Debito' : 'Credito'}</span>
            </p>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">CVV:</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={cvv}
                onChange={(e) => onChangeCvv(e.target.value)}
                placeholder="***"
                className={`w-full rounded-xl border px-3 py-2 ${cvvError ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
              />
              {cvvError && <p className="mt-1 text-xs text-red-600">{cvvError}</p>}
            </div>

            {paymentType === 'credito' && (
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">Cuotas:</label>
                <select
                  value={installments}
                  onChange={(e) => onChangeInstallments(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                >
                  {[1, 3, 6, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} cuota{n > 1 ? 's' : ''} {n > 1 ? `(interes ${(n - 1) * 5}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Canjear puntos:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={availablePoints}
                  value={pointsToUse}
                  onChange={(e) => onChangePointsToUse && onChangePointsToUse(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
                <span className="text-xs text-slate-600 whitespace-nowrap">Disp: {availablePoints}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">1 punto = $1 de descuento</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-semibold text-slate-900">Resumen de Pago</p>
              {paymentType === 'debito' ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Monto a Pagar:</span>
                    <span className="font-semibold text-slate-900">${summary.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cuota:</span>
                    <span className="font-semibold text-slate-900">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Interes:</span>
                    <span className="font-semibold text-slate-900">0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Descuento por puntos:</span>
                    <span className="font-semibold text-slate-900">-${pointsToUse}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-300 pt-2">
                    <span className="font-semibold text-slate-900">Total a pagar:</span>
                    <span className="font-bold text-blue-600">${summary.total}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold text-slate-900">${summary.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Interes ({(summary.interes * 100).toFixed(0)}%):</span>
                    <span className="font-semibold text-slate-900">${(summary.subtotal * summary.interes).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Descuento por puntos:</span>
                    <span className="font-semibold text-slate-900">-${pointsToUse}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-300 pt-2">
                    <span className="font-semibold text-slate-900">Total a Pagar:</span>
                    <span className="font-bold text-blue-600">${summary.total}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-slate-600">{installments} cuota{installments > 1 ? 's' : ''} de:</span>
                    <span className="font-semibold text-slate-900">${summary.montoPorCuota}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {paymentType === 'mercadopago_qr' && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-900">Resumen de Pago</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Metodo:</span>
                <span className="font-semibold text-slate-900">Mercado Pago QR</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-2">
                <span className="font-semibold text-slate-900">Total a Pagar:</span>
                <span className="font-bold text-blue-600">${summary.total}</span>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Canjear puntos:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={availablePoints}
                  value={pointsToUse}
                  onChange={(e) => onChangePointsToUse && onChangePointsToUse(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
                <span className="text-xs text-slate-600 whitespace-nowrap">Disp: {availablePoints}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">1 punto = $1 de descuento</p>
            </div>

            {qrCheckoutUrl && qrImageUrl && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex justify-center">
                  <img src={qrImageUrl} alt="QR Mercado Pago" className="h-64 w-64 max-w-full" />
                </div>
                {onOpenCheckout && (
                  <button
                    onClick={onOpenCheckout}
                    className="mt-3 w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Abrir checkout de Mercado Pago
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {message && <div className="mb-4 text-center font-semibold text-blue-700">{message}</div>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="w-full rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300 sm:w-auto"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={disableConfirm}
            className="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            {confirmLabel}
          </button>
          {paymentType === 'mercadopago_qr' && showVerifyQrButton && onVerifyQr && (
            <button
              onClick={onVerifyQr}
              disabled={isVerifyingQr}
              className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
            >
              {isVerifyingQr ? 'Verificando...' : 'Verificar pago QR'}
            </button>
          )}
        </div>
      </div>

      {showAddCardModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl sm:p-8">
            <h3 className="mb-4 text-xl font-bold text-slate-900">Agregar Tarjeta</h3>
            <p className="mb-6 text-slate-700">Completa los datos de tu tarjeta para agregarla y usarla en esta compra.</p>

            {newCardErrors.general && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{newCardErrors.general}</div>
            )}

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Numero de tarjeta"
                  value={newCard.numero}
                  onChange={(e) => onChangeNewCard('numero', e.target.value)}
                  className={`w-full rounded-lg border p-2 ${newCardErrors.numero ? 'border-red-500' : 'border-gray-300'}`}
                />
                {newCardErrors.numero && <p className="mt-1 text-sm text-red-600">{newCardErrors.numero}</p>}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Titular"
                  value={newCard.titular}
                  onChange={(e) => onChangeNewCard('titular', e.target.value)}
                  className={`w-full rounded-lg border p-2 ${newCardErrors.titular ? 'border-red-500' : 'border-gray-300'}`}
                />
                {newCardErrors.titular && <p className="mt-1 text-sm text-red-600">{newCardErrors.titular}</p>}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Vencimiento (MM/AA)"
                  value={newCard.vencimiento}
                  maxLength={5}
                  onChange={(e) => onChangeNewCard('vencimiento', e.target.value)}
                  className={`w-full rounded-lg border p-2 ${newCardErrors.vencimiento ? 'border-red-500' : 'border-gray-300'}`}
                />
                {newCardErrors.vencimiento && <p className="mt-1 text-sm text-red-600">{newCardErrors.vencimiento}</p>}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={onCloseAddCard}
                className="w-full rounded-full bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400 sm:w-auto"
              >
                Cancelar
              </button>
              <button
                onClick={onSaveNewCard}
                className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
