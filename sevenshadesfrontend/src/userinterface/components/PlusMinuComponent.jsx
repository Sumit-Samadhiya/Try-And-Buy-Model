import { useEffect, useState } from "react";

export default function PlusMinusComponent(props) {
   const [value, setValue] = useState(0);

   useEffect(function () {
      setValue(props.value || 0);
   }, [props.value]);

   const handlePlus = () => {
      if (props.disableIncrement) {
         return;
      }

      const nextValue = value + 1;
      setValue(nextValue);
      props.onChange(nextValue);
   };

   const handleMinus = () => {
      let nextValue = value;

      if (nextValue >= 1) {
         nextValue -= 1;
         setValue(nextValue);
      }

      props.onChange(nextValue);
   };

   return (
      <div style={{ marginTop: '12px' }}>
         {value === 0 ? (
            <div>
               <button
                  type="button"
                  style={{
                     backgroundColor: props.disableIncrement ? '#e2e8f0' : '#0f172a',
                     color: props.disableIncrement ? '#94a3b8' : '#ffffff',
                     border: 'none',
                     borderRadius: '10px',
                     minWidth: '220px',
                     height: '48px',
                     fontSize: '15px',
                     fontWeight: 700,
                     letterSpacing: '0.02em',
                     cursor: props.disableIncrement ? 'not-allowed' : 'pointer',
                     display: 'inline-flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     gap: '8px',
                     boxShadow: props.disableIncrement ? 'none' : '0 4px 12px rgba(15, 23, 42, 0.18)',
                     transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseOver={(e) => {
                     if (!props.disableIncrement) {
                        e.currentTarget.style.backgroundColor = '#1e293b';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.24)';
                     }
                  }}
                  onMouseOut={(e) => {
                     if (!props.disableIncrement) {
                        e.currentTarget.style.backgroundColor = '#0f172a';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.18)';
                     }
                  }}
                  onMouseDown={(e) => {
                     if (!props.disableIncrement) {
                        e.currentTarget.style.transform = 'translateY(1px)';
                     }
                  }}
                  aria-label={props.addLabel || 'Add to Try Bag'}
                  onClick={handlePlus}
                  disabled={props.disableIncrement}
               >
                  {props.addLabel || 'Add to Try Bag'}
               </button>
            </div>
         ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ffffff', border: '2px solid #0f172a', borderRadius: '10px', overflow: 'hidden' }}>
               <button
                  type="button"
                  style={{
                     backgroundColor: 'transparent',
                     color: '#0f172a',
                     border: 'none',
                     width: '44px',
                     height: '44px',
                     fontSize: '20px',
                     fontWeight: 700,
                     cursor: 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     transition: 'background-color 0.15s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={handleMinus}
                  aria-label="-"
               >
                  -
               </button>
               <div style={{ minWidth: '40px', textAlign: 'center', fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                  {value}
               </div>
               <button
                  type="button"
                  style={{
                     backgroundColor: props.disableIncrement ? '#f1f5f9' : 'transparent',
                     color: props.disableIncrement ? '#94a3b8' : '#0f172a',
                     border: 'none',
                     width: '44px',
                     height: '44px',
                     fontSize: '20px',
                     fontWeight: 700,
                     cursor: props.disableIncrement ? 'not-allowed' : 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     transition: 'background-color 0.15s ease',
                  }}
                  onMouseOver={(e) => {
                     if (!props.disableIncrement) e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }}
                  onMouseOut={(e) => {
                     if (!props.disableIncrement) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={handlePlus}
                  disabled={props.disableIncrement}
                  aria-label="+"
               >
                  +
               </button>
            </div>
         )}
         {props.helperText ? (
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
               <span>ℹ️</span>
               <span>{props.helperText}</span>
            </div>
         ) : null}
      </div>
   );
}