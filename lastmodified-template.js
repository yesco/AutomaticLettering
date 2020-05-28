// javascript to be injected in page
// every time you update/copy to server run
//   cat lastmodified-template.js| sed "s/<DATE>/`date +'%s.%N'`/" > lastmodified.js


// delayed setup until browser ready
setTimeout(()=>{
    let lastmodified_seconds_real = <DATE>;
    document.body.appendChild(Object.assign(document.createElement('div'), {
	style.background: 'yellow',
	style.fontSize: 32,
	innertext: 'lastmodied = ' + lastmodified_seconds_real + 's',
    }));
}, 0);
