import { Button } from "@mui/material";
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
      <div>
         {value === 0 ? (
            <div>
               <Button
                  variant="contained"
                  style={{
                     background: 'black',
                     color: 'white',
                     minWidth: 170,
                     fontSize: 15,
                     paddingInline: 18,
                  }}
                  onClick={handlePlus}
               >
                  {props.addLabel || 'Add to Bag'}
               </Button>
            </div>
         ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <Button
                  variant="contained"
                  style={{ background: 'black', color: 'white', minWidth: 44, fontSize: 18 }}
                  onClick={handleMinus}
               >
                  -
               </Button>
               <div style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{value}</div>
               <Button
                  variant="contained"
                  style={{ background: 'black', color: 'white', minWidth: 44, fontSize: 18 }}
                  onClick={handlePlus}
                  disabled={props.disableIncrement}
               >
                  +
               </Button>
            </div>
         )}
         {props.helperText ? (
            <div style={{ color: '#b33939', fontSize: 12, marginTop: 8 }}>{props.helperText}</div>
         ) : null}
      </div>
   );
}