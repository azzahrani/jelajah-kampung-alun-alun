// =============================
// VARIABEL GLOBAL
// =============================

var map;
var markers = [];
var lokasiData = [];
var sliderIndex = 0;

var defaultCenter = [-7.8285, 110.3980];
var defaultZoom = 16;


// =============================
// PINDAH DARI LANDING KE PETA
// =============================

function openMap() {
  document.getElementById("landingPage").classList.add("hide");
  document.getElementById("mapDashboard").classList.add("active");

  window.scrollTo(0, 0);

  setTimeout(function () {
    if (!map) {
      initMap();
    } else {
      map.invalidateSize();
    }
  }, 300);
}

function backHome() {
  document.getElementById("mapDashboard").classList.remove("active");
  document.getElementById("landingPage").classList.remove("hide");

  window.scrollTo(0, 0);
}

function resetView() {
  if (map) {
    map.setView(defaultCenter, defaultZoom);
  }
}


// =============================
// DRAWER SIDEBAR & PANEL DETAIL (KHUSUS TAMPILAN HP)
// =============================
// Di layar lebar, sidebar kiri & panel detail kanan selalu tampil
// berdampingan dengan peta. Di HP, keduanya disembunyikan dan hanya
// muncul sebagai panel geser (drawer) saat dibutuhkan.

var BATAS_LEBAR_MOBILE = 768;

function isTampilanMobile() {
  return window.innerWidth <= BATAS_LEBAR_MOBILE;
}

function toggleSidebar() {
  document.getElementById("sidebarPanel").classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("show");
}

function closeSidebar() {
  document.getElementById("sidebarPanel").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("show");
}

function openInfoSidebar() {
  document.getElementById("infoSidebarPanel").classList.add("open");
}

function closeInfoSidebar() {
  document.getElementById("infoSidebarPanel").classList.remove("open");
}


// =============================
// MEMBUAT PETA
// =============================

function initMap() {
  map = L.map("map").setView(defaultCenter, defaultZoom);

  var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
  }).addTo(map);

  var satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Tiles © Esri"
    }
  );

  var baseMaps = {
    "OpenStreetMap": osm,
    "Satelit": satellite
  };

  L.control.layers(baseMaps).addTo(map);

  L.control.scale({
    imperial: false
  }).addTo(map);

  // Kalau data CSV sudah pernah dimuat (dari halaman depan), langsung
  // tampilkan tanpa perlu load ulang. Kalau belum, baru load sekarang.
  if (lokasiData.length) {
    tampilkanMarker(lokasiData);
    isiFilter(lokasiData);
    isiDaftarLokasi(lokasiData);
  } else {
    loadCSV();
  }
}


// =============================
// DAFTAR LOKASI SEJARAH (HALAMAN DEPAN)
// =============================
// Mengisi kartu-kartu di section "Daftar Lokasi Sejarah" pada landing page,
// otomatis dari data CSV yang sama dipakai peta — supaya selalu sinkron.

function isiLokasiSejarahLanding(data) {
  var wrapper = document.getElementById("daftarLokasiSejarah");
  if (!wrapper) return;

  if (!data.length) {
    wrapper.innerHTML =
      '<p style="grid-column:1/-1; text-align:center;">Data lokasi belum tersedia.</p>';
    return;
  }

  wrapper.innerHTML = data
    .map(function (lokasi) {
      var ringkasan = lokasi.cerita || "";

      if (ringkasan.length > 160) {
        ringkasan = ringkasan.slice(0, 160).trim() + "...";
      }

      return `
        <div class="location-card">
          <h3>${lokasi.nama}</h3>
          <p>${ringkasan}</p>
        </div>
      `;
    })
    .join("");
}


// =============================
// MULAI MEMUAT DATA SAAT HALAMAN DIBUKA
// =============================

document.addEventListener("DOMContentLoaded", function () {
  loadCSV();
});


// =============================
// MEMBACA DATA CSV
// =============================

function loadCSV() {
  const csvPath = "Lokasi_Sejarah.csv";

  Papa.parse(csvPath, {
    download: true,
    header: true,
    skipEmptyLines: true,

    complete: function (results) {
      lokasiData = (results.data || []).map(normalisasiLokasi);

      if (!lokasiData.length) {
        console.warn("CSV terbaca tapi tidak ada data:", results);
      }

      // Kartu "Daftar Lokasi Sejarah" di halaman depan (selalu diisi)
      isiLokasiSejarahLanding(lokasiData);

      // Elemen peta cuma diisi kalau peta sudah dibuat (map sudah ada)
      if (map) {
        tampilkanMarker(lokasiData);
        isiFilter(lokasiData);
        isiDaftarLokasi(lokasiData);
      }
    },

    error: function (err) {
      console.error("Gagal memuat CSV:", err);
      alert(
        "File Lokasi_Sejarah.csv tidak terbaca.\n" +
        "Pastikan nama file benar dan gunakan Live Server."
      );
    }
  });
}


// =============================
// NORMALISASI NAMA KOLOM CSV
// =============================
// CSV kadang ditulis dengan nama kolom yang berbeda-beda
// (mis. "Nama Lokasi" vs "nama", "Latitude" vs "latitude").
// Fungsi ini mencocokkan kolom apa pun bentuknya ke format
// standar yang dipakai di seluruh script ini: nama, jenis,
// latitude, longitude, foto, cerita.

function ambilKolom(row, kemungkinanNama) {
  for (var i = 0; i < kemungkinanNama.length; i++) {
    if (row[kemungkinanNama[i]] !== undefined) {
      return row[kemungkinanNama[i]];
    }
  }

  var namaKolomAsli = Object.keys(row);

  for (var j = 0; j < namaKolomAsli.length; j++) {
    for (var k = 0; k < kemungkinanNama.length; k++) {
      if (namaKolomAsli[j].trim().toLowerCase() === kemungkinanNama[k].toLowerCase()) {
        return row[namaKolomAsli[j]];
      }
    }
  }

  return "";
}

function normalisasiLokasi(row) {
  return {
    nama: ambilKolom(row, ["nama", "Nama Lokasi", "Nama", "nama lokasi"]),
    jenis: ambilKolom(row, ["jenis", "Jenis"]),
    latitude: ambilKolom(row, ["latitude", "Latitude", "lat"]),
    longitude: ambilKolom(row, ["longitude", "Longitude", "lng", "long"]),
    foto: ambilKolom(row, ["foto", "Foto"]),
    cerita: ambilKolom(row, ["cerita", "Cerita"])
  };
}


// =============================
// FOTO (MENDUKUNG LEBIH DARI 1 FOTO)
// =============================
// Di CSV, kolom "foto" bisa diisi lebih dari satu file, dipisah tanda ";"
// Contoh: foto/a.jpg;foto/b.jpg;foto/c.jpg

function parseFotoList(fotoString) {
  if (!fotoString || fotoString.trim() === "") return [];

  return fotoString
    .split(";")
    .map(function (f) { return f.trim(); })
    .filter(function (f) { return f !== ""; });
}


// =============================
// ICON MARKER KUSTOM (BULAT, SAMA SEPERTI LEGENDA)
// =============================

var iconLokasi = L.divIcon({
  className: "marker-lokasi",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10]
});


// =============================
// MENAMPILKAN MARKER
// =============================

function tampilkanMarker(data) {
  hapusMarker();

  data.forEach(function (lokasi, index) {
    var lat = parseFloat(lokasi.latitude);
    var lng = parseFloat(lokasi.longitude);

    if (!isNaN(lat) && !isNaN(lng)) {

      var fotoList = parseFotoList(lokasi.foto);
      var popupFoto = "";

      // Popup di peta cukup tampilkan 1 foto pertama saja (biar ringkas)
      if (fotoList.length > 0) {
        popupFoto = `<img src="${fotoList[0]}" class="popup-img" alt="${lokasi.nama}">`;
      }

      var marker = L.marker([lat, lng], { icon: iconLokasi }).addTo(map);

      marker.bindPopup(`
        <div class="popup-content">
          ${popupFoto}
          <h3>${lokasi.nama}</h3>
          <p><b>Jenis:</b> ${lokasi.jenis}</p>
          <p><b>Koordinat:</b> ${lat}, ${lng}</p>
        </div>
      `);

      marker.on("click", function () {
        tampilkanDetail(index);
      });

      markers.push({
        marker: marker,
        data: lokasi,
        index: index
      });
    }
  });
}

function hapusMarker() {
  markers.forEach(function (item) {
    map.removeLayer(item.marker);
  });

  markers = [];
}


// =============================
// PANEL DETAIL
// =============================

function tampilkanDetail(index) {

  var lokasi = lokasiData[index];

  if (!lokasi) return;

  var lat = parseFloat(lokasi.latitude);
  var lng = parseFloat(lokasi.longitude);

  var fotoList = parseFotoList(lokasi.foto);
  var fotoHTML = "";

  if (fotoList.length > 0) {
    sliderIndex = 0;

    var slideImgs = fotoList
      .map(function (src, i) {
        var kelasAktif = i === 0 ? " aktif" : "";
        return `<img src="${src}" class="slide-img${kelasAktif}" alt="${lokasi.nama}">`;
      })
      .join("");

    var slideDots = fotoList
      .map(function (_, i) {
        var kelasAktif = i === 0 ? " aktif" : "";
        return `<span class="slide-dot${kelasAktif}" onclick="lompatSlide(${i})"></span>`;
      })
      .join("");

    var tombolNav = "";
    if (fotoList.length > 1) {
      tombolNav = `
        <button class="slide-nav prev" onclick="gantiSlide(-1)">&#8249;</button>
        <button class="slide-nav next" onclick="gantiSlide(1)">&#8250;</button>
      `;
    }

    fotoHTML = `
      <div class="photo-slider">
        <div class="slide-track">${slideImgs}</div>
        ${tombolNav}
        <div class="slide-dots">${slideDots}</div>
      </div>
    `;
  }

  document.getElementById("detailLokasi").innerHTML = `
    ${fotoHTML}

    <h2>${lokasi.nama}</h2>

    <span class="detail-label">${lokasi.jenis}</span>

    <table class="detail-table">
      <tr>
        <td>Koordinat</td>
        <td>${lat}, ${lng}</td>
      </tr>
    </table>

    <h3>Cerita Sejarah</h3>

    <p class="detail-story">
      ${lokasi.cerita}
    </p>
  `;

  map.setView([lat, lng], 18);

  // Di tampilan HP: tutup drawer daftar lokasi (kalau sedang terbuka)
  // lalu tampilkan panel detail sebagai drawer dari kanan.
  if (isTampilanMobile()) {
    closeSidebar();
    openInfoSidebar();
  }
}


// =============================
// NAVIGASI SLIDE FOTO
// =============================

function gantiSlide(arah) {
  var slides = document.querySelectorAll(".slide-img");
  var dots = document.querySelectorAll(".slide-dot");

  if (!slides.length) return;

  sliderIndex = (sliderIndex + arah + slides.length) % slides.length;
  perbaruiSlide(slides, dots);
}

function lompatSlide(target) {
  var slides = document.querySelectorAll(".slide-img");
  var dots = document.querySelectorAll(".slide-dot");

  if (!slides.length) return;

  sliderIndex = target;
  perbaruiSlide(slides, dots);
}

function perbaruiSlide(slides, dots) {
  slides.forEach(function (img, i) {
    img.classList.toggle("aktif", i === sliderIndex);
  });

  dots.forEach(function (dot, i) {
    dot.classList.toggle("aktif", i === sliderIndex);
  });
}


// =============================
// FILTER
// =============================

function isiFilter(data) {

  var filter = document.getElementById("filterJenis");
  filter.innerHTML = '<option value="Semua">Semua</option>';

  var jenisSet = new Set();

  data.forEach(function (lokasi) {
    if (lokasi.jenis && lokasi.jenis.trim() !== "") {
      jenisSet.add(lokasi.jenis.trim());
    }
  });

  jenisSet.forEach(function (jenis) {

    var option = document.createElement("option");

    option.value = jenis;
    option.textContent = jenis;

    filter.appendChild(option);
  });

}

function filterMarker() {

  var pilihan = document.getElementById("filterJenis").value;

  var dataFilter;

  if (pilihan === "Semua") {
    dataFilter = lokasiData;
  } else {
    dataFilter = lokasiData.filter(function (lokasi) {
      return lokasi.jenis === pilihan;
    });
  }

  tampilkanMarker(dataFilter);
  isiDaftarLokasi(dataFilter);

}


// =============================
// DAFTAR LOKASI
// =============================

function isiDaftarLokasi(data) {

  var list = document.getElementById("listLokasi");

  list.innerHTML = "";

  data.forEach(function (lokasi) {

    var indexAsli = lokasiData.indexOf(lokasi);

    var item = document.createElement("div");

    item.className = "lokasi-item";

    item.innerHTML = `
      <h4>${lokasi.nama}</h4>
      <p>${lokasi.jenis}</p>
    `;

    item.onclick = function () {

      var lat = parseFloat(lokasi.latitude);
      var lng = parseFloat(lokasi.longitude);

      if (!isNaN(lat) && !isNaN(lng)) {

        map.setView([lat, lng], 18);

        tampilkanDetail(indexAsli);

        markers.forEach(function (m) {

          if (m.data.nama === lokasi.nama) {
            m.marker.openPopup();
          }

        });

      }

    };

    list.appendChild(item);

  });

}
